__author__ = 'bryson'

"""
    The Simple Factory isn't actually an official Design Pattern.  It's more of a programming idiom.
"""


class SimplePizzaFactory(object):
    @staticmethod
    def create_pizza(type):
        if type is "cheese":
            pizza = CheesePizza()
        elif type is "pepperoni":
            pizza = PepperoniPizza()
        elif type is "clam":
            pizza = ClamPizza()
        elif type is "veggie":
            pizza = VeggiePizza()
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


class CheesePizza(Pizza):
    def __init__(self):
        super(CheesePizza, self).__init__()

    def prepare(self):
        pass

    def bake(self):
        pass

    def cut(self):
        pass

    def box(self):
        pass


class PepperoniPizza(Pizza):
    def __init__(self):
        super(PepperoniPizza, self).__init__()

    def prepare(self):
        pass

    def bake(self):
        pass

    def cut(self):
        pass

    def box(self):
        pass


class ClamPizza(Pizza):
    def __init__(self):
        super(ClamPizza, self).__init__()

    def prepare(self):
        pass

    def bake(self):
        pass

    def cut(self):
        pass

    def box(self):
        pass


class VeggiePizza(Pizza):
    def __init__(self):
        super(VeggiePizza, self).__init__()

    def prepare(self):
        pass

    def bake(self):
        pass

    def cut(self):
        pass

    def box(self):
        pass


class PizzaStore(object):
    def __init__(self, factory):
        self.factory = factory

    def order_pizza(self, type):
        pizza = self.factory.create_pizza(type)

        pizza.prepare()
        pizza.bake()
        pizza.cut()
        pizza.box()

        return pizza