__author__ = 'bryson'

"""
A DTO that can easily be configured with varying attributes.
* : *args will give you all function parameters as a tuple
** : **kwargs will give you all keyword arguments as a dictionary (keyword args)
"""


class Messenger(object):
    def __init__(self, **kwargs):
        self.__dict__ = kwargs


m = Messenger(info="some information", b=["a", "list"])
m.more = 11
print(m.info, m.b, m.more)