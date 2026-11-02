# 🎬 AsientosCine

Web para guardar y visualizar mis asientos favoritos en cada sala de cine. Cada asiento se puede marcar como **Ideal**, **Aceptable** o **Evitar**, y se le puede dejar una observación.

**Sitio:** https://angixs-zz.github.io/AsientosCine/

## Cómo usarla

- Elige una sala en la lista de la izquierda (en el móvil, con el botón ☰).
- Toca cualquier asiento del mapa para:
  - marcarlo como **Ideal**, **Aceptable** o **Evitar**;
  - escribir una observación (por ejemplo, "centrado con la pantalla").
- **+ Nueva sala** crea una sala nueva indicando cine, nombre, filas, asientos por fila y sentido de numeración.
- **Editar sala** permite cambiar el nombre, las dimensiones, la numeración o la observación general. Las salas con mapa rescatado muestran una etiqueta **Mapa real**.
- **+ Cine** agrupa las salas por cine (por ejemplo, Cinemex Plaza Bella).
- **Exportar** descarga un respaldo `.json`. **Importar** lo vuelve a cargar.

> Los cambios se guardan en el `localStorage` del navegador. No se suben solos a GitHub: para no perderlos, usa **Exportar** de vez en cuando (sobre todo si cambias de dispositivo o borras los datos del navegador).

## Datos iniciales

La web arranca con las salas y observaciones que tenía apuntadas. Las salas 2, 5, 8, 9, 10, 11 y 12 usan los mapas reales rescatados de la app de Cinépolis Oaxaca (filas, cantidad de asientos por fila, sillas de ruedas y sentido de numeración).

| Cine | Sala | Tamaño | Asientos marcados |
| --- | --- | --- | --- |
| Cinépolis Oaxaca | Sala 2 | 16 × 28 | K13, K14 ideales; J13, J14 aceptables |
| Cinépolis Oaxaca | Sala 3 | 14 × 16 | G5, G6, H5, H6 ideales; F4, F5, F6 aceptables |
| Cinépolis Oaxaca | Sala 4 | 14 × 16 | Sin datos todavía |
| Cinépolis Oaxaca | Sala 5 | 12 × 15 | H5-H7 y J5-J7 ideales; G5-G7 aceptables |
| Cinépolis Oaxaca | Sala 7 | 14 × 16 | H3-H10 ideales |
| Cinépolis Oaxaca | Sala 8 | 11 × 16 | Mapa rescatado; sin asientos marcados |
| Cinépolis Oaxaca | Sala 9 | 10 × 20 | H7, H8 ideales |
| Cinépolis Oaxaca | Sala 10 | 16 × 30 | J13, J14, L15, L16 ideales |
| Cinépolis Oaxaca | Sala 11 | 10 × 16 | G6-G9 ideales (Zootopia) |
| Cinépolis Oaxaca | Sala 12 | 10 × 16 | Mapa rescatado; sin asientos marcados |
| Cinépolis Oaxaca | Sala 13 | 14 × 16 | G8, G9 ideales |
| Cinemex Plaza Bella | Por confirmar | 14 × 16 | J8, J9 ideales |

Las salas 3, 4, 7 y 13 todavía usan una cuadrícula base editable. Ajústalas con **Editar sala** si conoces su mapa real.

### Sentido de numeración

En los mapas de Cinépolis Oaxaca, algunas salas numeran los asientos de derecha a izquierda (el 1 queda a la derecha) y otras de izquierda a derecha. La web lo respeta y lo muestra en **Editar sala → Numeración de los asientos**:

- **1 a la izquierda:** Sala 5, Sala 10, Sala 12.
- **1 a la derecha:** Sala 2, Sala 8, Sala 9, Sala 11.

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
  "version": 2,
  "activeRoomId": "sala-11",
  "cinemas": [
    {
      "id": "cinemex",
      "name": "Cinépolis Oaxaca",
      "rooms": [
        {
          "id": "sala-11",
          "name": "Sala 11",
          "rows": 10,
          "cols": 16,
          "numbering": "rtl",
          "rowCounts": {
            "A": 13, "B": 13, "C": 13, "D": 13, "E": 13, "F": 13,
            "G": 15, "H": 12, "I": 13, "J": 16
          },
          "wheelchairs": { "H": 2 },
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

- `numbering`: `"ltr"` = el asiento 1 va a la izquierda; `"rtl"` = el 1 va a la derecha.
- `rowCounts`: cantidad de posiciones por fila (asientos + sillas de ruedas). Si falta una fila, se usa `cols`.
- `wheelchairs`: cuántas sillas de ruedas tiene esa fila. Ocupan el extremo contrario al asiento 1.
- `level`: `2` = ideal, `1` = aceptable, `-1` = evitar, `0` = solo nota. Los asientos se identifican con letra de fila + número, por ejemplo `G9`.
