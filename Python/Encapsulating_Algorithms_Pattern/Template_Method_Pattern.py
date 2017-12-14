__author__ = 'bryson'

from abc import ABCMeta, abstractmethod

"""
The Template Method Pattern defines the skeleton of an algorithm in a method, deferring some steps to subclasses.
Template Method lets subclasses redefine certain steps of an algorithm without changing the algorithm's structure.
"""


class CaffeineBeverage(object):
    __metaclass__ = ABCMeta

    def boil_water(self):
        print("Boiling Water.")

    def pour_in_cup(self):
        print("Pouring into cup.")

    def prepare_recipe(self):
        self.boil_water()
        self.brew()
        self.pour_in_cup()
        self.add_condiments()

    @abstractmethod
    def brew(self):
        pass

    @abstractmethod
    def add_condiments(self):
        pass


class Coffee(CaffeineBeverage):
    def brew(self):
        print("Dripping Coffee through filter.")

    def add_condiments(self):
        print("Adding Sugar and Milk")


class Tea(CaffeineBeverage):
    def brew(self):
        print("Steeping the tea")

    def add_condiments(self):
        print("Adding Lemon")

