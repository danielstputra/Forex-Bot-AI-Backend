const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Find the simulation menu we just created
    const menu = await prisma.systemMenu.findUnique({ where: { key: 'simulation' } });
    if (!menu) {
      console.log('Menu simulation tidak ditemukan!');
      return;
    }
    console.log('Found menu:', menu.id);

    // Get all roles from Role table (not customRole)
    const roles = await prisma.role.findMany({}).catch(() => []);
    console.log('Found roles from Role table:', roles.length);

    if (roles.length > 0) {
      for (const role of roles) {
        await prisma.roleMenuAccess.upsert({
          where: { roleId_menuId: { roleId: role.id, menuId: menu.id } },
          update: { canRead: true, canWrite: false },
          create: { roleId: role.id, menuId: menu.id, canRead: true, canWrite: false }
        });
        console.log('Granted access to role:', role.name || role.id);
      }
    } else {
      // Try to find roles directly from roleMenuAccess existing records
      const existingAccesses = await prisma.roleMenuAccess.findMany({ take: 20 });
      const uniqueRoleIds = [...new Set(existingAccesses.map(a => a.roleId))];
      console.log('Found unique role IDs from existing accesses:', uniqueRoleIds);
      
      for (const roleId of uniqueRoleIds) {
        await prisma.roleMenuAccess.upsert({
          where: { roleId_menuId: { roleId, menuId: menu.id } },
          update: { canRead: true, canWrite: false },
          create: { roleId, menuId: menu.id, canRead: true, canWrite: false }
        });
        console.log('Granted access to roleId:', roleId);
      }
    }

    console.log('DONE! Menu simulation accessible to all roles.');
  } catch(e) {
    console.error('Error:', e.message, e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
