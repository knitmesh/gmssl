__author__ = 'bryson'

"""
The Iterator Pattern provides a way to access the elements of an aggregate object sequentially without exposing its
underlying representation.
"""


class yrange:
    def __init__(self, n):
        self.i = 0
        self.n = n

    def __iter__(self):
        return self

    def __next__(self):
        if self.i < self.n:
            i = self.i
            self.i += 1
            return i
        else:
            raise StopIteration()

y = yrange(3)
y.__next__()

i = iter(y)
i.__next__()