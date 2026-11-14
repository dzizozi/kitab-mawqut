package io.github.dzizozi.alkitab;

import android.os.Bundle;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean longBack = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SheetPrinterPlugin.class);
        registerPlugin(ScreenPlugin.class);
        registerPlugin(UpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }

    /** Long press on «Back» (about 1 s): return to the first-start choice (phone / mosque display). */
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            if (e.getAction() == KeyEvent.ACTION_DOWN) {
                if (e.getRepeatCount() == 0) longBack = false;
                else if (!longBack && (e.isLongPress() || e.getEventTime() - e.getDownTime() >= 800)) {
                    longBack = true;
                    if (getBridge() != null && getBridge().getWebView() != null)
                        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript("window.kmLongBack && window.kmLongBack()", null));
                }
                if (longBack) return true;
            } else if (e.getAction() == KeyEvent.ACTION_UP && longBack) {
                longBack = false;
                return true;                               // do not also run the normal «Back»
            }
        }
        return super.dispatchKeyEvent(e);
    }
}
