# Ofertas CPE - Chrome Web Store Listing

## Name
Ofertas CPE

## Short Description
Historial de precios de tiendas online en Perú. Compara, encuentra la mejor oferta y ahorra dinero en tus compras.

## Detailed Description
**Ofertas CPE** es tu asistente de compras ideal para el comercio electrónico en Perú. Creado por **Moisés Sakiyama Freyre de Comunidadcpe.com**, esta extensión gratuita te permite conocer la evolución del precio de un producto a lo largo del tiempo. 

¿Cansado de dudar si una oferta es realmente buena? Con Ofertas CPE, cada vez que visites una tienda online, la extensión analizará automáticamente el precio y lo guardará en un historial privado local. Así, cuando vuelvas a visitar el producto, podrás ver una gráfica clara de cómo ha cambiado su valor y decidir si es el mejor momento para comprar.

### Características:
- **Gráfico de historial de precios:** Observa la tendencia y asegura tu ahorro.
- **Privacidad primero:** Todo tu historial se guarda localmente en tu navegador.
- **Diseño Premium:** Interfaz moderna y modo oscuro nativo.

## Permissions Justification

- `sidePanel`: Requerido para mostrar la interfaz principal de la extensión de manera persistente sin interrumpir la navegación del usuario en la tienda.
- `storage`: Requerido para guardar localmente el historial de precios de los productos que el usuario visita. No se envían datos a servidores externos.
- `tabs`: Requerido para leer la URL y comunicarse con la pestaña activa para extraer el precio del producto y actualizar el panel lateral.

## Host Permissions Justification

- `<all_urls>`: Requerido para poder inyectar el script de análisis y extracción de precios (`content.js`) de forma genérica en múltiples tiendas de comercio electrónico, identificando metadatos (Schema.org / OpenGraph) para obtener la información del producto, sin estar limitados a una lista cerrada de dominios, ya que el usuario podría visitar tiendas nuevas o locales.

## Version History
- **1.0.0**: Lanzamiento inicial con historial de precios local y diseño premium.
