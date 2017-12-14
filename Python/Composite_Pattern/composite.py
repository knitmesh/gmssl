from abc import ABCMeta, abstractmethod

__author__ = 'bryson'

"""
The Composite Pattern allows you to compose objects into tree structures to represent part-whole hierarchies.
Composite lets clients treat individual objects and compositions of objects uniformly.
"""


class MenuComponent(object):
    __metaclass__ = ABCMeta

    @abstractmethod
    def add(self, menu_component):
        raise NotImplementedError()

    @abstractmethod
    def remove(self, menu_component):
        raise NotImplementedError()

    @abstractmethod
    def get_child(self, i):
        raise NotImplementedError()

    @abstractmethod
    def get_name(self):
        raise NotImplementedError()

    @abstractmethod
    def get_description(self):
        raise NotImplementedError()

    @abstractmethod
    def get_price(self):
        raise NotImplementedError()

    @abstractmethod
    def is_vegetarian(self):
        raise NotImplementedError()

    @abstractmethod
    def __str__(self):
        raise NotImplementedError()


class MenuItem(MenuComponent):
    def __init__(self, name, description, vegetarian, price):
        self.name = name
        self.description = description
        self.vegetarian = vegetarian
        self.price = price

    def get_name(self):
        return self.name

    def get_description(self):
        return self.description

    def get_price(self):
        return self.price

    def is_vegetarian(self):
        return self.vegetarian

    def __str__(self):
        return " " + self.get_name() + "\n" + str(self.get_price()) + "\n" + str(self.get_description())


class Menu(MenuComponent):
    def __init__(self, name, description):
        self.name = name
        self.description = description
        self.menu_components = []

    def add(self, menu_component):
        self.menu_components.append(menu_component)

    def remove(self, menu_component):
        self.menu_components.remove(menu_component)

    def get_child(self, i):
        return self.menu_components[i]

    def get_name(self):
        return self.name

    def get_description(self):
        return self.description

    def __str__(self):
        string = "\n" + self.get_name() + "\n" + self.get_description() + "\n--------------------"
        for item in self.menu_components:
            string += "\n" + str(item)