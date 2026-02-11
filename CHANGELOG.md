# Changelog

All notable changes to this project will be documented in this file.

## [Stage K2 Patch] - 2026-02-10

### Corregido
- Desacople entre la tabla `players` y la RPC `player_create_guest_player`.
- Error de columna `city` inexistente en producción.
- Firma de función RPC para creación de invitados desalineada con el frontend.

### Agregado
- Campos geográficos en `players`: `country_code`, `region_code`, `city`, `city_normalized`.
- Campo `created_by` y `is_guest` en `players` para mejor trazabilidad.
- Índices para búsqueda ponderada por ubicación (`idx_players_location`).
- Parche seguro de migración idempotente.
- Lógica de "Zero-Safety" para el teléfono de invitados (default '00000000').

## [Stage K2] - 2026-02-10
### Agregado
- Búsqueda de jugadores ponderada por ubicación (Ciudad/Provincia).
- Nueva RPC `player_search_players` con sistema de scoring.
- Etiquetas enriquecidas en la selección de jugadores: "Inicial.Apellido — Ciudad (Región)".
- Soporte para ubicación en la creación de jugadores invitados.

## [Stage K1] - 2026-02-09
### Agregado
- Sistema de jugadores invitados.
- Proceso de "Claim Profile" para vincular cuentas de usuario a perfiles de jugadores pre-existentes.
- Restricciones de co-participación en partidos.
