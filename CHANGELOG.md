# Changelog - PASALA

## [v1.6.0-onboarding-lock-avatars] - 2026-02-17

### Añadido
- **Registro por Email**: Nuevo flujo de alta de usuarios mediante email y contraseña en `/player/login`.
- **Blindaje de Onboarding (One-Shot)**: Protección por base de datos (RPC) y Middleware para asegurar que el perfil se complete una única vez.
- **Sistema de Avatares Consistente**: Lógica de prioridad (Storage > Google > Iniciales) aplicada en toda la plataforma.
- **Componente UserAvatar**: Componente UI reutilizable para mostrar perfiles con soporte de iniciales y fotos firmadas de Supabase.
- **Ruta de Signout**: Endpoint `/auth/signout` en el servidor para un cierre de sesión seguro.

### Mejoras
- **Middleware Propagativo**: El middleware ahora captura rutas de bienvenida y fuerza la finalización del perfil.
- **MatchRepository Extendido**: Soporte para la propagación de `avatar_url` en listados de partidos y detalles de puntaje.
- **Optimización de requirePlayer**: Reducción de consultas redundantes a la base de datos al unificar la carga del perfil.

### Corregido
- **Bucle de Redirección**: Se solucionó el "hang" al finalizar el onboarding asegurando la persistencia correcta en la base de datos y forzando el refresco de sesión en el cliente.
- **Consistencia SQL**: Sincronización de funciones RPC entre el entorno local y Supabase.

---
*Nueva etapa lista para comenzar.*
