from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    actual = text.count(old)
    if actual != count:
        raise SystemExit(
            f"{path}: expected {count} occurrence(s), found {actual}: {old[:120]!r}"
        )
    file.write_text(text.replace(old, new, count))


replace(
    "tests/integration/business-operations.test.ts",
    '        emailVerified: true,\n        role: "platform_admin",\n',
    '        emailVerified: true,\n',
)
replace(
    "src/modules/businesses/contacts-and-enquiries.ts",
    '    case "directions":\n      return value.length >= 3;\n',
    '    case "directions":\n'
    '      if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return isSafeHttpUrl(value);\n'
    '      return value.length >= 3;\n',
)
Path("final-test-errors.txt").unlink(missing_ok=True)
