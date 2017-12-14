__author__ = 'bryson'

"""
The Factory Method Pattern defines an interface for creating an object, but lets subclasses decide which class to
instantiate.  Factory Method lets a class defer instantiation to subclasses.
"""


class PizzaStore(object):
    def __init__(self):
        pass

    def order_pizza(self, type):
        pizza = self.create_pizza(type)

        pizza.prepare()
        pizza.bake()
        pizza.cut()
        pizza.box()

        return pizza

    def create_pizza(self, type):
        raise NotImplementedError()


class NYStylePizzaStore(PizzaStore):
    def __init__(self):
        super(NYStylePizzaStore, self).__init__()

    def create_pizza(self, type):
        if type is "cheese":
            pizza = NYStyleCheesePizza()
        elif type is "pepperoni":
            pizza = NYStylePepperoniPizza()
        elif type is "clam":
            pizza = NYStyleClamPizza()
        elif type is "veggie":
            pizza = NYStyleVeggiePizza()
        else:
            pizza = None

        return pizza


class Pizza(object):
    def __init__(self):
        pass

    def prepare(self):
        raise NotImplementedError()

    def bake(self):
        raise NotImplementedError()

    def cut(self):
        raise NotImplementedError()

    def box(self):
        raise NotImplementedError()


class NYStyleCheesePizza(Pizza):
    def __init__(self):
        super(NYStyleCheesePizza, self).__init__()

    def prepare(self):
        pass

    def bake(self):
        pass

    def cut(self):
        pass

    def box(self):
        pass


class NYStylePepperoniPizza(Pizza):
    def __init__(self):
        super(NYStylePepperoniPizza, self).__init__()

    def prepare(self):
        pass

    def bake(self):
        pass

    def cut(self):
        pass

    def box(self):
        pass


class NYStyleClamPizza(Pizza):
    def __init__(self):
        super(NYStyleClamPizza, self).__init__()

    def prepare(self):
        pass

    def bake(self):
        pass

    def cut(self):
        pass

    def box(self):
        pass


class NYStyleVeggiePizza(Pizza):
    def __init__(self):
        super(NYStyleVeggiePizza, self).__init__()

    def prepare(self):
        pass

    def bake(self):
        pass

    def cut(self):
        pass

    def box(self):
        pass


