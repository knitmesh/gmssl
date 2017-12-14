__author__ = 'bryson'

from abc import ABCMeta, abstractmethod


class Duck(object):
    __metaclass__ = ABCMeta

    @abstractmethod
    def quack(self):
        return

    @abstractmethod
    def fly(self):
        return


class MallardDuck(Duck):
    def quack(self):
        print("Quack")

    def fly(self):
        print("I'm flying")


class Turkey(object):
    __metaclass__ = ABCMeta

    @abstractmethod
    def gobble(self):
        return

    @abstractmethod
    def fly(self):
        return


class WildTurkey(Turkey):
    def gobble(self):
        print("Gobble gobble.")

    def fly(self):
        print("I'm flying a short distance.")


class TurkeyAdapter(Duck):
    def __init__(self, turkey):
        self.turkey = turkey

    def quack(self):
        self.turkey.gobble()

    def fly(self):
        for i in range(0,5):
            self.turkey.fly()



duck = MallardDuck()

turkey = WildTurkey()
turkey_adapter = TurkeyAdapter(turkey)

turkey.gobble()
turkey.fly()

turkey_adapter.quack()
turkey_adapter.fly()