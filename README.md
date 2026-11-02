# 🎬 AsientosCine

Web para guardar y visualizar mis asientos favoritos en cada sala de cine. Cada asiento se puede marcar como **Ideal**, **Aceptable** o **Evitar**, y se le puede dejar una observación.

**Sitio:** https://angixs-zz.github.io/AsientosCine/

## Cómo usarla

- Elige una sala en la lista de la izquierda (en el móvil, con el botón ☰).
- Toca cualquier asiento del mapa para:
  - marcarlo como **Ideal**, **Aceptable** o **Evitar**;
  - escribir una observación (por ejemplo, "centrado con la pantalla").
- **+ Nueva sala** crea una sala nueva indicando cine, nombre, filas y asientos por fila.
- **Editar sala** permite cambiar el nombre, las dimensiones o la observación general.
- **+ Cine** agrupa las salas por cine (por ejemplo, Cinemex Plaza Bella).
- **Exportar** descarga un respaldo `.json`. **Importar** lo vuelve a cargar.

> Los cambios se guardan en el `localStorage` del navegador. No se suben solos a GitHub: para no perderlos, usa **Exportar** de vez en cuando (sobre todo si cambias de dispositivo o borras los datos del navegador).

## Datos iniciales

La web arranca con las salas y observaciones que tenía apuntadas:

| Cine | Sala | Asientos |
| --- | --- | --- |
| Cinemex | Sala 2 | K13, K14 ideales; J13, J14 aceptables |
| Cinemex | Sala 3 | G5, G6, H5, H6 ideales; F4, F5, F6 aceptables |
| Cinemex | Sala 4 | Sin datos todavía |
| Cinemex | Sala 5 | H5-H7 y J5-J7 ideales; G5-G7 aceptables |
| Cinemex | Sala 7 | H3-H10 ideales |
| Cinemex | Sala 9 | H7, H8 ideales |
| Cinemex | Sala 10 | J13, J14, L15, L16 ideales |
| Cinemex | Sala 11 | G6-G9 ideales (Zootopia) |
| Cinemex | Sala 13 | G8, G9 ideales |
| Cinemex Plaza Bella | Por confirmar | J8, J9 ideales |

Las dimensiones de las salas son una base editable (14 filas × 16 asientos). Ajústalas con **Editar sala** si tu sala real es distinta.

## Archivos

```
index.html   estructura de la página
styles.css   estilos (tema oscuro, responsive)
app.js       datos de ejemplo, mapa de asientos y lógica de edición
```

No hay build ni dependencias: es HTML, CSS y JavaScript puro, ideal para GitHub Pages.

## Publicar en GitHub Pages

El repositorio ya está configurado para publicar desde la rama `main`, carpeta raíz:

1. Sube los cambios a `main`.
2. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)**.
3. La web queda en `https://angixs-zz.github.io/AsientosCine/`.

## Formato del respaldo

El JSON exportado tiene esta forma:

```json
{
  "version": 1,
  "activeRoomId": "sala-11",
  "cinemas": [
    {
      "id": "cinemex",
      "name": "Cinemex",
      "rooms": [
        {
          "id": "sala-11",
          "name": "Sala 11",
          "rows": 14,
          "cols": 16,
          "note": "Zootopia: fila G, asientos 9, 8, 7 y 6.",
          "seats": {
            "G9": { "level": 2, "note": "" }
          }
        }
      ]
    }
  ]
}
```

`level`: `2` = ideal, `1` = aceptable, `-1` = evitar, `0` = solo nota. Los asientos se identifican con letra de fila + número, por ejemplo `G9`.
