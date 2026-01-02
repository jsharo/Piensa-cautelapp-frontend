// Capacitor Background Runner - Event Listeners
addEventListener('checkAlarms', async (resolve, reject, args) => {
    try {
        console.log('Background check running...');
        // Aquí podrías añadir lógica adicional si fuera necesario
        // Por ahora, LocalNotifications maneja el disparo principal
        resolve();
    } catch (error) {
        reject(error);
    }
});
