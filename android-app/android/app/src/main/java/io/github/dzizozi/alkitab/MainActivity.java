package io.github.dzizozi.alkitab;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SheetPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
