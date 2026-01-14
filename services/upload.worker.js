
// File Upload Worker
// Handles reading files as Data URLs off the main thread to prevent UI freezing

self.onmessage = async (e) => {
    const { file, id } = e.data;

    try {
        const reader = new FileReader();

        reader.onload = () => {
            self.postMessage({
                success: true,
                dataUrl: reader.result,
                id
            });
        };

        reader.onerror = () => {
            self.postMessage({
                success: false,
                error: reader.error.message,
                id
            });
        };

        reader.readAsDataURL(file);

    } catch (err) {
        self.postMessage({
            success: false,
            error: err.message,
            id
        });
    }
};
