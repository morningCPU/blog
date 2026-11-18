# -*- coding: utf-8 -*-
"""Generate the QR images embedded in share cards.

The generator only uses the Python standard library so the blog manager keeps
working without pip packages. QR files are named by the MD5 of the target URL;
the Hugo share-card template uses the same key.
"""

import hashlib
import os
import re
import struct
import zlib
from urllib.parse import quote


ECC_LEVEL_BITS = 0

# version: (ecc codewords per block, group1 blocks, group1 data,
#           group2 blocks, group2 data)
VERSION_PARAMS = {
    1: (10, 1, 16, 0, 0),
    2: (16, 1, 28, 0, 0),
    3: (26, 1, 44, 0, 0),
    4: (18, 2, 32, 0, 0),
    5: (24, 2, 43, 0, 0),
    6: (16, 4, 27, 0, 0),
    7: (18, 4, 31, 0, 0),
    8: (22, 2, 38, 2, 39),
    9: (22, 3, 36, 2, 37),
    10: (26, 4, 43, 1, 44),
}

ALIGNMENT_POSITIONS = {
    1: [],
    2: (6, 18),
    3: (6, 22),
    4: (6, 26),
    5: (6, 30),
    6: (6, 34),
    7: (6, 22, 38),
    8: (6, 24, 42),
    9: (6, 26, 46),
    10: (6, 28, 50),
}

PAD_BYTES = (0xEC, 0x11)


def _data_codewords(version):
    _ecc, g1_blocks, g1_data, g2_blocks, g2_data = VERSION_PARAMS[version]
    return g1_blocks * g1_data + g2_blocks * g2_data


def _choose_version(byte_length):
    for version in range(1, 11):
        count_bits = 8 if version <= 9 else 16
        if 4 + count_bits + byte_length * 8 <= _data_codewords(version) * 8:
            return version
    raise ValueError("QR payload is too long for versions 1-10")


def _gf_multiply(x, y):
    result = 0
    for shift in range(7, -1, -1):
        result = (result << 1) ^ ((result >> 7) * 0x11D)
        result ^= ((y >> shift) & 1) * x
    return result


def _rs_divisor(degree):
    result = [0] * degree
    result[-1] = 1
    root = 1
    for _ in range(degree):
        for index in range(degree):
            result[index] = _gf_multiply(result[index], root)
            if index + 1 < degree:
                result[index] ^= result[index + 1]
        root = _gf_multiply(root, 0x02)
    return result


def _rs_remainder(data, divisor):
    result = [0] * len(divisor)
    for value in data:
        factor = value ^ result[0]
        result = result[1:] + [0]
        for index, coefficient in enumerate(divisor):
            result[index] ^= _gf_multiply(coefficient, factor)
    return result


def _append_bits(bits, value, width):
    for shift in range(width - 1, -1, -1):
        bits.append((value >> shift) & 1)


def _make_codewords(data, version):
    count_bits = 8 if version <= 9 else 16
    capacity_bits = _data_codewords(version) * 8
    bits = []
    _append_bits(bits, 0b0100, 4)
    _append_bits(bits, len(data), count_bits)
    for value in data:
        _append_bits(bits, value, 8)
    if len(bits) > capacity_bits:
        raise ValueError("QR payload exceeds version capacity")

    bits.extend([0] * min(4, capacity_bits - len(bits)))
    while len(bits) % 8:
        bits.append(0)

    codewords = []
    for offset in range(0, len(bits), 8):
        value = 0
        for bit in bits[offset:offset + 8]:
            value = (value << 1) | bit
        codewords.append(value)

    pad_index = 0
    while len(codewords) < capacity_bits // 8:
        codewords.append(PAD_BYTES[pad_index % 2])
        pad_index += 1
    return codewords


def _add_error_correction(codewords, version):
    ecc_length, g1_blocks, g1_data, g2_blocks, g2_data = VERSION_PARAMS[version]
    blocks = []
    offset = 0
    for _ in range(g1_blocks):
        blocks.append(codewords[offset:offset + g1_data])
        offset += g1_data
    for _ in range(g2_blocks):
        blocks.append(codewords[offset:offset + g2_data])
        offset += g2_data

    divisor = _rs_divisor(ecc_length)
    ecc_blocks = [_rs_remainder(block, divisor) for block in blocks]

    result = []
    for index in range(max(len(block) for block in blocks)):
        for block in blocks:
            if index < len(block):
                result.append(block[index])
    for index in range(ecc_length):
        for block in ecc_blocks:
            result.append(block[index])
    return result


def _draw_finder(modules, reserved, center_x, center_y):
    size = len(modules)
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            x = center_x + dx
            y = center_y + dy
            if 0 <= x < size and 0 <= y < size:
                distance = max(abs(dx), abs(dy))
                modules[y][x] = distance not in (2, 4)
                reserved[y][x] = True


def _draw_alignment(modules, reserved, center_x, center_y):
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            distance = max(abs(dx), abs(dy))
            modules[center_y + dy][center_x + dx] = distance != 1
            reserved[center_y + dy][center_x + dx] = True


def _draw_format_bits(modules, reserved, mask):
    size = len(modules)
    data = (ECC_LEVEL_BITS << 3) | mask
    remainder = data
    for _ in range(10):
        remainder = (remainder << 1) ^ ((remainder >> 9) * 0x537)
    bits = (data << 10 | remainder) ^ 0x5412

    def set_module(x, y, dark):
        modules[y][x] = bool(dark)
        reserved[y][x] = True

    for index in range(6):
        set_module(8, index, (bits >> index) & 1)
    set_module(8, 7, (bits >> 6) & 1)
    set_module(8, 8, (bits >> 7) & 1)
    set_module(7, 8, (bits >> 8) & 1)
    for index in range(9, 15):
        set_module(14 - index, 8, (bits >> index) & 1)

    for index in range(8):
        set_module(size - 1 - index, 8, (bits >> index) & 1)
    for index in range(8, 15):
        set_module(8, size - 15 + index, (bits >> index) & 1)
    set_module(8, size - 8, True)


def _draw_version_bits(modules, reserved, version):
    if version < 7:
        return
    size = len(modules)
    remainder = version
    for _ in range(12):
        remainder = (remainder << 1) ^ ((remainder >> 11) * 0x1F25)
    bits = (version << 12) | remainder
    for index in range(18):
        dark = (bits >> index) & 1
        x = size - 11 + index % 3
        y = index // 3
        modules[y][x] = bool(dark)
        reserved[y][x] = True
        modules[x][y] = bool(dark)
        reserved[x][y] = True


def _draw_function_patterns(version):
    size = 17 + version * 4
    modules = [[False] * size for _ in range(size)]
    reserved = [[False] * size for _ in range(size)]

    for index in range(size):
        modules[6][index] = index % 2 == 0
        modules[index][6] = index % 2 == 0
        reserved[6][index] = True
        reserved[index][6] = True

    _draw_finder(modules, reserved, 3, 3)
    _draw_finder(modules, reserved, size - 4, 3)
    _draw_finder(modules, reserved, 3, size - 4)

    positions = ALIGNMENT_POSITIONS[version]
    for center_y in positions:
        for center_x in positions:
            if ((center_x == 6 and center_y == 6)
                    or (center_x == size - 7 and center_y == 6)
                    or (center_x == 6 and center_y == size - 7)):
                continue
            _draw_alignment(modules, reserved, center_x, center_y)

    _draw_format_bits(modules, reserved, 0)
    _draw_version_bits(modules, reserved, version)
    return modules, reserved


def _draw_data(modules, reserved, codewords):
    size = len(modules)
    bit_index = 0
    total_bits = len(codewords) * 8
    right = size - 1
    while right >= 1:
        if right == 6:
            right = 5
        upward = ((right + 1) & 2) == 0
        for vertical in range(size):
            y = size - 1 - vertical if upward else vertical
            for offset in range(2):
                x = right - offset
                if reserved[y][x]:
                    continue
                dark = False
                if bit_index < total_bits:
                    dark = bool((codewords[bit_index >> 3]
                                 >> (7 - (bit_index & 7))) & 1)
                    bit_index += 1
                modules[y][x] = dark
        right -= 2


def _mask_condition(mask, x, y):
    if mask == 0:
        return (x + y) % 2 == 0
    if mask == 1:
        return y % 2 == 0
    if mask == 2:
        return x % 3 == 0
    if mask == 3:
        return (x + y) % 3 == 0
    if mask == 4:
        return (x // 3 + y // 2) % 2 == 0
    if mask == 5:
        return (x * y) % 2 + (x * y) % 3 == 0
    if mask == 6:
        return ((x * y) % 2 + (x * y) % 3) % 2 == 0
    return ((x + y) % 2 + (x * y) % 3) % 2 == 0


def _apply_mask(modules, reserved, mask):
    size = len(modules)
    for y in range(size):
        for x in range(size):
            if not reserved[y][x] and _mask_condition(mask, x, y):
                modules[y][x] = not modules[y][x]


def _penalty(modules):
    size = len(modules)
    score = 0

    for y in range(size):
        run = 1
        for x in range(1, size):
            if modules[y][x] == modules[y][x - 1]:
                run += 1
            else:
                if run >= 5:
                    score += 3 + run - 5
                run = 1
        if run >= 5:
            score += 3 + run - 5

    for x in range(size):
        run = 1
        for y in range(1, size):
            if modules[y][x] == modules[y - 1][x]:
                run += 1
            else:
                if run >= 5:
                    score += 3 + run - 5
                run = 1
        if run >= 5:
            score += 3 + run - 5

    for y in range(size - 1):
        for x in range(size - 1):
            if (modules[y][x] == modules[y][x + 1]
                    == modules[y + 1][x] == modules[y + 1][x + 1]):
                score += 3

    patterns = (
        (True, False, True, True, True, False, True,
         False, False, False, False),
        (False, False, False, False, True, False, True,
         True, True, False, True),
    )
    for y in range(size):
        row = modules[y]
        for x in range(size - 10):
            window = tuple(row[x:x + 11])
            if window in patterns:
                score += 40
    for x in range(size):
        column = [modules[y][x] for y in range(size)]
        for y in range(size - 10):
            window = tuple(column[y:y + 11])
            if window in patterns:
                score += 40

    dark = sum(sum(1 for value in row if value) for row in modules)
    total = size * size
    score += abs(dark * 20 - total * 10) // total * 10
    return score


def make_qr_matrix(text):
    data = text.encode("utf-8")
    version = _choose_version(len(data))
    codewords = _add_error_correction(
        _make_codewords(data, version), version
    )

    modules, reserved = _draw_function_patterns(version)
    _draw_data(modules, reserved, codewords)

    best_modules = None
    best_score = None
    for mask in range(8):
        candidate = [row[:] for row in modules]
        candidate_reserved = [row[:] for row in reserved]
        _apply_mask(candidate, candidate_reserved, mask)
        _draw_format_bits(candidate, candidate_reserved, mask)
        score = _penalty(candidate)
        if best_score is None or score < best_score:
            best_modules = candidate
            best_score = score
    return best_modules


def _png_chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))


def write_qr_png(path, matrix, scale=8, quiet=4):
    size = len(matrix)
    dimension = (size + quiet * 2) * scale
    raw = bytearray()
    dark_pixel = b"\x17\x21\x2b"
    light_pixel = b"\xff\xff\xff"
    for pixel_y in range(dimension):
        raw.append(0)
        module_y = pixel_y // scale - quiet
        for pixel_x in range(dimension):
            module_x = pixel_x // scale - quiet
            dark = (0 <= module_x < size and 0 <= module_y < size
                    and matrix[module_y][module_x])
            raw.extend(dark_pixel if dark else light_pixel)

    header = struct.pack(">IIBBBBB", dimension, dimension, 8, 2, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n"
           + _png_chunk(b"IHDR", header)
           + _png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
           + _png_chunk(b"IEND", b""))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as handle:
        handle.write(png)


def _read_text(path):
    with open(path, "r", encoding="utf-8-sig") as handle:
        return handle.read()


def _read_base_url(blog_dir):
    config_path = os.path.join(blog_dir, "hugo.yaml")
    if not os.path.isfile(config_path):
        return "https://morningCPU.github.io/blog"
    match = re.search(
        r"(?m)^\s*base[uU][rR][lL]\s*:\s*[\"']?([^\s\"']+)",
        _read_text(config_path),
    )
    return match.group(1).rstrip("/") if match else "https://morningCPU.github.io/blog"


def _read_slug(path):
    match = re.search(
        r"(?m)^\s*slug\s*=\s*[\"']?([^\"'\r\n#]+?)[\"']?\s*(?:#.*)?$",
        _read_text(path),
    )
    return match.group(1).strip() if match else ""


def post_url(base_url, slug):
    return "%s/p/%s/" % (base_url.rstrip("/"), quote(slug, safe=""))


def qr_resource_name(url):
    digest = hashlib.md5(url.encode("utf-8")).hexdigest()
    return "share/qr/%s.png" % digest


def generate_for_blog(blog_dir):
    base_url = _read_base_url(blog_dir)
    post_dir = os.path.join(blog_dir, "content", "post")
    qr_dir = os.path.join(blog_dir, "assets", "share", "qr")
    generated = []
    if not os.path.isdir(post_dir):
        return generated
    for folder in sorted(os.listdir(post_dir)):
        md_path = os.path.join(post_dir, folder, "index.md")
        if not os.path.isfile(md_path):
            continue
        slug = _read_slug(md_path)
        if not slug:
            continue
        url = post_url(base_url, slug)
        resource = qr_resource_name(url)
        target = os.path.join(blog_dir, "assets", *resource.split("/"))
        write_qr_png(target, make_qr_matrix(url))
        generated.append(target)
    return generated


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for path in generate_for_blog(root):
        print(path)
