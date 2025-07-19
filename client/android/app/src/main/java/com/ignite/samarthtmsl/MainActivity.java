package com.samarth.ignite;

import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        
        registerPlugin(GoogleAuth.class);
    }

    @Override
    public void onStart() {
        super.onStart();
        Log.d("MainActivity", "App started, verbose logging enabled");
    }
}
