from pathlib import Path

path = Path("tests/integration/business-operations.test.ts")
text = path.read_text()
text = text.replace(
    '        summary: "Fictional published business A.",\n',
    '        summary: "Fictional published business A.",\n'
    '        description: "Fictional published business A used only by automated tests.",\n',
    1,
)
text = text.replace(
    '        summary: "Fictional published business B.",\n',
    '        summary: "Fictional published business B.",\n'
    '        description: "Fictional published business B used only by automated tests.",\n',
    1,
)
path.write_text(text)
Path("final-typecheck-errors.txt").unlink(missing_ok=True)
