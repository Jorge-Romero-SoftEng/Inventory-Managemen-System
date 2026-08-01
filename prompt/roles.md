RBAC
- Nuevas tablas Role, Policy, RolePolicy + migración 20260731183000_rbac_and_soft_delete (aplicada). User ahora tiene roleId, active, deletedAt; se eliminó el string role.
- Seed: 24 políticas, roles Admin (24) y Cajero (8), admin user con rol Admin.
- src/lib/policies.ts: catálogo de políticas + requirePolicy() (401 si inactivo/borrado, 403 sin permiso) aplicado en las 26 rutas de API. Nuevos endpoints /api/users, /api/roles, /api/policies, /api/auth/me. Se eliminó /api/auth/register (hueco de seguridad).
- Login rechaza usuarios inactivos; JWT lleva roleId. pos ya no manda userId: 1: el servidor usa la sesión.
- Páginas /users (crear/editar, toggle habilitar/deshabilitar, cambiar rol) y /roles (asignar políticas con checkboxes por módulo). Sidebar y TopBar muestran rol + nombre y ocultan nav según permisos.
Soft delete
- deletedAt en Product, Category, Customer, PriceList, User, Role. Todos los DELETE son lógicos y los GET filtran borrados. Categoría borrada desliga sus productos. Borrado de rol deshabilita sus usuarios; no se puede borrar el propio usuario ni roles isSystem.
- Nombres/barcodes borrados siguen ocupados (confirmado: 409).
Verificado: typecheck y next build OK; seed OK; pruebas curl de login, RBAC (403/200), disable, soft-delete (404/409), guardas. El lint sigue roto por el issue pre-existente de brace-expansion.