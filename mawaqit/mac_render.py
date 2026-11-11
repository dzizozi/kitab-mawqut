"""macOS fallback renderer (no Chrome/Firefox installed): built-in WebKit (WKWebView) snapshot via PyObjC."""
import os


def snapshot(html_path, png_path, scale):
    import objc
    from Foundation import NSURL, NSRunLoop, NSDate, NSMakeRect
    from AppKit import NSApplication, NSBitmapImageRep, NSPNGFileType, NSApplicationActivationPolicyProhibited
    from WebKit import WKWebView, WKWebViewConfiguration, WKSnapshotConfiguration

    app = NSApplication.sharedApplication()
    app.setActivationPolicy_(NSApplicationActivationPolicyProhibited)
    web = WKWebView.alloc().initWithFrame_configuration_(NSMakeRect(0, 0, 794, 1123), WKWebViewConfiguration.alloc().init())
    url = NSURL.fileURLWithPath_(os.path.abspath(html_path))
    web.loadFileURL_allowingReadAccessToURL_(url, NSURL.fileURLWithPath_('/'))

    def spin(seconds):
        NSRunLoop.currentRunLoop().runUntilDate_(NSDate.dateWithTimeIntervalSinceNow_(seconds))

    for _ in range(100):
        spin(0.1)
        if not web.isLoading():
            break
    spin(1.5)   # fonts + layout
    done = {}

    def handler(image, error):
        done['img'], done['err'] = image, error

    conf = WKSnapshotConfiguration.alloc().init()
    conf.setRect_(NSMakeRect(0, 0, 794, 1123))
    conf.setSnapshotWidth_(794 * scale / 2)    # points; retina backing doubles it
    web.takeSnapshotWithConfiguration_completionHandler_(conf, handler)
    for _ in range(200):
        spin(0.05)
        if done: break
    img = done.get('img')
    if img is None:
        raise RuntimeError('WebKit snapshot failed: %s' % done.get('err'))
    tiff = img.TIFFRepresentation()
    rep = NSBitmapImageRep.imageRepWithData_(tiff)
    rep.representationUsingType_properties_(NSPNGFileType, None).writeToFile_atomically_(png_path, True)
