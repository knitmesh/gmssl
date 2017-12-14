__author__ = 'bryson'

"""
Or functions defined in a module could be treated as singletons in most cases.
"""


class OnlyOne:
    class __OnlyOne:
        def __init__(self, arg):
            self.arg = arg

        def __str__(self):
            return repr(self) + self.arg

    instance = None

    def __init__(self, arg):
        if not OnlyOne.instance:
            OnlyOne.instance = OnlyOne.__OnlyOne(arg)
        else:
            OnlyOne.instance.val = arg

    def __getattr__(self, item):
        return getattr(self.instance, item)