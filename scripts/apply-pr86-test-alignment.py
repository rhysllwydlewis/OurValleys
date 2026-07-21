from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "tests/integration/business-operations.test.ts",
    '''  business,
  businessPublication,
''',
    '''  business,
  businessMembership,
  businessPublication,
''',
)
replace_once(
    "tests/integration/business-operations.test.ts",
    '''import {
  createBusinessTicket,
  resolveBusinessTicket,
} from "@/modules/businesses/tickets";
''',
    '''import {
  createBusinessTicket,
  resolveBusinessTicket,
} from "@/modules/businesses/tickets";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";
''',
)
replace_once(
    "tests/integration/business-operations.test.ts",
    '''    await database.insert(businessEntitlement).values([
''',
    '''    await database.insert(businessMembership).values({
      businessId: fixture.businessA,
      userId: fixture.ownerId,
      role: "owner",
      permissions: permissionsForBusinessRole("owner"),
      status: "active",
    });
    await database.insert(businessEntitlement).values([
''',
)
