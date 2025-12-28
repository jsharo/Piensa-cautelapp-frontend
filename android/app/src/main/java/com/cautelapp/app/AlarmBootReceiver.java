package com.cautelapp.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AlarmBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.d("AlarmBootReceiver", "Dispositivo reiniciado, reprogramando alarmas");
            // Aquí puedes reprogramar las alarmas
            // Necesitarías implementar la lógica para leer las alarmas guardadas
            // y reprogramarlas usando AlarmManager
        }
    }
}
