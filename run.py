"""Entry point.  run.py  -> window ;  run.py --auto -> hourly background check (Task Scheduler)."""
import sys


def main():
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
