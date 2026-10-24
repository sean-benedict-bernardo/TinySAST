from datetime import datetime


def shorten_hash(hash: str) -> str:
    return hash[:8].upper()

class Logger:
    IS_LOGGING = True
    IS_VERBOSE = True  # Set to True to enable debug messages

    ALWAYS = "always"
    VERBOSE = "verbose"

    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"

    @staticmethod
    def __get_log_prefix(type: str) -> str:
        if type == Logger.INFO:
            return "[i]"
        elif type == Logger.SUCCESS:
            return "[✓]"
        elif type == Logger.WARNING:
            return "[x]"
        elif type == Logger.ERROR:
            return "[!]"
        else:
            return "[.]"

    @staticmethod
    def debug(message: str, type: str, mode: str = "always"):
        """
        type can be
        - info
        - warning
        - error

        mode can be
        - always (logs regardless)
        - verbose (logs only if VERBOSE is True)
        """

        if Logger.IS_LOGGING == False:
            return

        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if mode == Logger.ALWAYS or (mode == Logger.VERBOSE and Logger.IS_VERBOSE):
            print(f"{current_time} {Logger.__get_log_prefix(type)} {message}")
