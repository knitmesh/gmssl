__author__ = 'bryson'

""" The STRATEGY pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable.
    Strategy lets the algorithm vary independently from clients that use it.
"""


class Duck(object):
    # noinspection PyMethodMayBeStatic
    def swim(self):
        print "All ducks float, even decoys!"

    def fly(self):
        raise NotImplementedError()

    def quack(self):
        raise NotImplementedError()


def fly_with_wings():
    print "I'm flying!!"


def fly_no_way():
    print "I can't fly"


def quack():
    print "Quack"


def mute_quack():
    print "<< Silence >>"


def squeak():
    print "Squeak"


# noinspection PyAbstractClass
class Mallard(Duck):
    def __init__(self):
        self.fly = fly_with_wings
        self.quack = quack


# noinspection PyAbstractClass
class RubberDuck(Duck):
    def __init__(self):
        self.fly = fly_no_way
        self.quack = quack

mallard = Mallard()
mallard.fly()
mallard.quack()

rubber_duck = RubberDuck()
rubber_duck.fly()
rubber_duck.quack()
rubber_duck.swim()