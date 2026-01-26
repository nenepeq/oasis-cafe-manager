/**
 * Redimensiona y comprime una imagen antes de subirla.
 * @param {File} file - Archivo de imagen original.
 * @param {Object} options - Opciones de configuración.
 * @param {number} options.maxWidth - Ancho máximo permitido (default: 1280px).
 * @param {number} options.quality - Calidad de compresión JPEG (0 a 1, default: 0.7).
 * @returns {Promise<File|Blob>} - Archivo comprimido.
 */
export const compressImage = (file, { maxWidth = 1280, quality = 0.7 } = {}) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(file);

        image.onload = () => {
            let width = image.width;
            let height = image.height;

            // Calcular nuevas dimensiones manteniendo aspect ratio
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, width, height);

            // Convertir a Blob/File comprimido
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        // Crear un nuevo objeto File con el contenido comprimido
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        console.log(`📸 Compresión: ${(file.size / 1024).toFixed(2)}KB -> ${(compressedFile.size / 1024).toFixed(2)}KB`);
                        resolve(compressedFile);
                    } else {
                        reject(new Error('Falló la compresión de la imagen'));
                    }
                },
                'image/jpeg',
                quality
            );
        };

        image.onerror = (err) => reject(err);
    });
};
