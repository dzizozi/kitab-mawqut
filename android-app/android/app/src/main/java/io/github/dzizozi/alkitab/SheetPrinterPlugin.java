package io.github.dzizozi.alkitab;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Prints the monthly sheet (HTML) through the Android print framework: any printer or "Save as PDF". */
@CapacitorPlugin(name = "SheetPrinter")
public class SheetPrinterPlugin extends Plugin {
    private static final String TAG = "SheetPrinter";
    private WebView printView;   // must stay referenced until the print job is created
    private boolean started;

    @PluginMethod
    public void print(PluginCall call) {
        final String html = call.getString("html", "");
        final String name = call.getString("name", "Mawaqit");
        final Handler main = new Handler(Looper.getMainLooper());
        main.post(() -> {
            try {
                final Context ctx = getActivity();
                started = false;
                printView = new WebView(ctx);
                printView.getSettings().setAllowFileAccess(true);
                final Runnable go = () -> {
                    if (started) return;
                    started = true;
                    Log.d(TAG, "creating print job");
                    PrintManager pm = (PrintManager) ctx.getSystemService(Context.PRINT_SERVICE);
                    PrintDocumentAdapter adapter = printView.createPrintDocumentAdapter(name);
                    PrintAttributes attrs = new PrintAttributes.Builder()
                            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                            .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                            .build();
                    pm.print(name, adapter, attrs);
                    call.resolve();
                };
                printView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        Log.d(TAG, "page finished");
                        main.postDelayed(go, 700);      // let the fonts settle
                    }
                });
                String page = html.replace("</style>",
                        "@media print{@page{size:A4;margin:0}html,body{width:794px;height:1123px}}</style>");
                printView.loadDataWithBaseURL("file:///android_asset/public/", page, "text/html", "utf-8", null);
                main.postDelayed(go, 5000);             // safety net
            } catch (Exception e) {
                Log.e(TAG, "print failed", e);
                call.reject(e.getMessage());
            }
        });
    }
}
