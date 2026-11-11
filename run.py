"""Entry point.  run.py  -> window ;  run.py --auto -> hourly background check (Task Scheduler)."""
import sys


def main():
    if '--selftest' in sys.argv:          # diagnostic: render the sheet (A4 + A3) without printing
        from mawaqit import core, config
        cfg = config.load(); M = core.build_model(cfg)
        for paper in ('A4', 'A3'):
            try:
                png, pdf = core.render_files(M, cfg, paper=paper)
                core.log.info('selftest %s ok: %s', paper, png)
            except Exception:
                core.log.exception('selftest %s', paper)
        return
    if '--background' in sys.argv:
        from mawaqit import core
        try:
            core.background_loop()
        except Exception:
            core.log.exception('background')
        return
    if '--auto' in sys.argv:
        from mawaqit import core
        try:
            core.auto_run()
        except Exception:
            core.log.exception('auto run')
        return
    from mawaqit import app
    app.main(debug='--debug' in sys.argv)


if __name__ == '__main__':
    main()
