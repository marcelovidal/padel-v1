# Guía para crear el primer admin

## Paso 1: Crear usuario en Supabase Auth

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Authentication** > **Users**
3. Haz clic en **Add user** > **Create new user**
4. Ingresa:
   - Email: `admin@example.com` (o el que prefieras)
   - Password: (genera una segura)
   - Auto Confirm User: ✅ (marca esta opción)

5. Copia el **User UID** que se genera

## Paso 2: Insertar/actualizar profile con role='admin'

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Reemplaza 'USER_UID_AQUI' con el UID que copiaste
INSERT INTO profiles (id, role)
VALUES ('USER_UID_AQUI', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

O si prefieres hacerlo desde la UI de Supabase:
1. Ve a **Table Editor** > **profiles**
2. Inserta un nuevo registro:
   - `id`: pega el User UID
   - `role`: `admin`

## Verificación

Para verificar que funciona, ejecuta:

```sql
SELECT p.id, p.role, u.email 
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin';
```

Deberías ver tu usuario admin listado.

## Nota de seguridad

En producción, asegúrate de:
- Usar una contraseña fuerte
- Habilitar 2FA si es posible
- No exponer las credenciales del admin


