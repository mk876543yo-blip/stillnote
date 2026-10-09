package org.stillnote.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JsResult;
import android.speech.RecognizerIntent;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final int SPEECH_REQUEST = 4102;
    private static final int OPEN_FILE_REQUEST = 4103;
    private static final int SAVE_FILE_REQUEST = 4104;
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private String pendingFileName;
    private String pendingFileContent;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(243, 245, 249));
        window.setNavigationBarColor(Color.rgb(243, 245, 249));
        window.getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        webView.setBackgroundColor(Color.rgb(243, 245, 249));
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            int top;
            int bottom;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                top = bars.top;
                bottom = bars.bottom;
            } else {
                top = insets.getSystemWindowInsetTop();
                bottom = insets.getSystemWindowInsetBottom();
            }
            view.setPadding(0, top, 0, bottom);
            return insets;
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        // The network security config below allows HTTP only to loopback hosts,
        // which is needed for the optional local Ollama connection.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setWebViewClient(new LocalAppWebViewClient(assetLoader));
        webView.setWebChromeClient(new StillnoteWebChromeClient());
        webView.addJavascriptInterface(new AndroidBridge(), "StillnoteAndroid");
        setContentView(webView);
        webView.requestApplyInsets();
        webView.loadUrl("https://" + ASSET_HOST + "/assets/www/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OPEN_FILE_REQUEST) {
            if (fileChooserCallback != null) {
                Uri[] result = resultCode == RESULT_OK && data != null && data.getData() != null
                        ? new Uri[]{data.getData()} : null;
                fileChooserCallback.onReceiveValue(result);
                fileChooserCallback = null;
            }
            return;
        }
        if (requestCode == SAVE_FILE_REQUEST) {
            saveSelectedFile(resultCode, data);
            return;
        }
        if (requestCode != SPEECH_REQUEST) return;

        if (resultCode == RESULT_OK && data != null) {
            ArrayList<String> matches = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (matches != null && !matches.isEmpty()) {
                dispatchToPage("stillnote:dictation", matches.get(0));
                return;
            }
        }
        dispatchToPage("stillnote:dictation-ended", "No speech was added.");
    }

    private void dispatchToPage(String eventName, String detail) {
        if (webView == null) return;
        String javascript = "window.dispatchEvent(new CustomEvent(" + JSONObject.quote(eventName)
                + ",{detail:" + JSONObject.quote(detail) + "}));";
        runOnUiThread(() -> webView.evaluateJavascript(javascript, null));
    }

    private void launchSpeechRecognition(String languageTag) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,
                languageTag == null || languageTag.isEmpty() ? Locale.getDefault().toLanguageTag() : languageTag);
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak your note, then tap Done.");
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        try {
            startActivityForResult(intent, SPEECH_REQUEST);
        } catch (ActivityNotFoundException error) {
            dispatchToPage("stillnote:dictation-ended", "No speech recognition service is installed on this device.");
        }
    }

    private void openFilePicker(ValueCallback<Uri[]> callback) {
        if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
        fileChooserCallback = callback;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        try {
            startActivityForResult(intent, OPEN_FILE_REQUEST);
        } catch (ActivityNotFoundException error) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
        }
    }

    private void createTextFile(String filename, String mimeType, String content) {
        pendingFileName = filename;
        pendingFileContent = content;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType == null || mimeType.isEmpty() ? "text/plain" : mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        try {
            startActivityForResult(intent, SAVE_FILE_REQUEST);
        } catch (ActivityNotFoundException error) {
            clearPendingFile();
            dispatchToPage("stillnote:file-save-error", "No file manager is available to save this file.");
        }
    }

    private void saveSelectedFile(int resultCode, Intent result) {
        if (resultCode != RESULT_OK || result == null || result.getData() == null || pendingFileContent == null) {
            clearPendingFile();
            return;
        }
        try (OutputStream output = getContentResolver().openOutputStream(result.getData())) {
            if (output == null) throw new IllegalStateException("Could not open destination file.");
            output.write(pendingFileContent.getBytes(StandardCharsets.UTF_8));
            dispatchToPage("stillnote:file-saved", pendingFileName == null ? "File saved." : pendingFileName);
        } catch (Exception error) {
            dispatchToPage("stillnote:file-save-error", "Could not save the file. Try another location.");
        } finally {
            clearPendingFile();
        }
    }

    private void clearPendingFile() {
        pendingFileName = null;
        pendingFileContent = null;
    }

    private final class AndroidBridge {
        @JavascriptInterface
        public void startDictation(String languageTag) {
            runOnUiThread(() -> launchSpeechRecognition(languageTag));
        }

        @JavascriptInterface
        public void saveTextFile(String filename, String mimeType, String content) {
            runOnUiThread(() -> createTextFile(filename, mimeType, content));
        }
    }

    private final class StillnoteWebChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            openFilePicker(callback);
            return true;
        }

        @Override
        public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
            new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                    .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel())
                    .show();
            return true;
        }

        @Override
        public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
            new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                    .setOnCancelListener(dialog -> result.confirm())
                    .show();
            return true;
        }
    }

    private static final class LocalAppWebViewClient extends WebViewClientCompat {
        private final WebViewAssetLoader assetLoader;

        LocalAppWebViewClient(WebViewAssetLoader assetLoader) {
            this.assetLoader = assetLoader;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return assetLoader.shouldInterceptRequest(request.getUrl());
        }

        @SuppressWarnings("deprecation")
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            return assetLoader.shouldInterceptRequest(Uri.parse(url));
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            return !"https".equals(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost());
        }

        @SuppressWarnings("deprecation")
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            return !"https".equals(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost());
        }
    }
}
