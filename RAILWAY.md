# Guía de Despliegue en Railway

Esta guía detalla los pasos para desplegar la aplicación en [Railway](https://railway.app/) y configurar la persistencia de datos.

## 1. Configuración del Proyecto

1. **Nuevo Proyecto**: En Railway, crea un "Nuevo Proyecto" desde tu repositorio de GitHub.
2. **Variables de Entorno**:
   - Railway detectará automáticamente el `Dockerfile`.
   - Ve a la pestaña **Settings** > **General** y asegúrate de que el **Build Command** y **Start Command** estén vacíos (usará los del Dockerfile) o sean correctos.

## 2. Configurar Volumen de Persistencia (Base de Datos)

Para que la base de datos `central.db` no se pierda en cada despliegue, necesitamos un Volumen.

1. Abre tu servicio en Railway.
2. Ve a la pestaña **Volumes**.
3. Haz clic en **Add Volume**.
4. Usa la siguiente configuración:
   - **Mount Path**: `/app/database`
   - **Volume Name**: `sqlite-data` (o cualquier nombre que prefieras)

> [!NOTE]
> El `Dockerfile` está configurado para buscar la base de datos en `/app/database/central.db` mediante la variable de entorno por defecto en la imagen `ENV DATABASE_URL /app/database/central.db`.

## 3. Verificar Variables de Entorno

Asegúrate de que el servicio tenga acceso a escribir en esa ruta. Al montar el volumen en `/app/database`, cualquier archivo escrito allí persistirá.

Si necesitas cambiar la ruta, añade una variable de entorno:
- `DATABASE_URL` = `/app/database/central.db`

## 4. Descargar Base de Datos (Backup)

Hemos implementado una ruta para descargar la base de datos actual.

1. Inicia sesión como administrador (si la ruta está protegida, actualmente es pública pero oculta).
2. Navega a: `https://<tu-dominio-railway>.up.railway.app/api/admin/backup`
3. Se descargará el archivo `.db`.

## 5. Restaurar / Cargar Base de Datos Local

Para "copiar a tu laptop":
1. Descarga el backup usando el paso anterior.

## 6. Comandos Git para Subir el Código

Para subir tu código a GitHub y que Railway despliegue automáticamente:

```bash
# 1. Asegúrate de estar en la carpeta del frontend
cd D:\2025_validos\Seguridad\eventos_app\frontend

# 2. Inicializar repo si no existe (si ya existe, salta este paso)
# git init

# 3. Añadir todos los cambios
git add .

# 4. Crear commit
git commit -m "feat: config deployment railway and volumes"

# 5. Subir a GitHub (asegúrate de tener configurado el remote origin)
# Si no tienes remote: git remote add origin <URL_DE_TU_REPO>
git push origin main
```

## 7. Subir Base de Datos Local (Restore)

Para subir tu base de datos local (`central.db`) al servidor en Railway:

**Usando cURL (Terminal):**

```bash
# Reemplaza <TU_DOMINIO> con el dominio que Railway te asignó
curl -X POST -F "file=@D:\2025_validos\Seguridad\eventos_app\frontend\database\central.db" https://<TU_DOMINIO>.up.railway.app/api/admin/restore
```

**Respuesta exitosa:**
```json
{"success":true,"message":"Base de datos restaurada correctamente"}
```

