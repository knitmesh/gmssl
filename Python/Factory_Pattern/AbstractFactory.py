__author__ = 'bryson'

"""
The Abstract Factory Pattern provides an interface for creating families of related or dependent objects
without specifying their concrete classes.
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
        self.ingredientFactory = NYPizzaIngredientFactory()

    def create_pizza(self, type):
        if type is "cheese":
            pizza = NYStyleCheesePizza(self.ingredientFactory)
        elif type is "pepperoni":
            pizza = NYStylePepperoniPizza(self.ingredientFactory)
        elif type is "clam":
            pizza = NYStyleClamPizza(self.ingredientFactory)
        elif type is "veggie":
            pizza = NYStyleVeggiePizza(self.ingredientFactory)
        else:
            pizza = None

        return pizza


class Pizza(object):
    def __init__(self):
        self.dough = None
        self.sauce = None
        self.cheese = None

    def prepare(self):
        raise NotImplementedError()

    def bake(self):
        raise NotImplementedError()

    def cut(self):
        raise NotImplementedError()

    def box(self):
        raise NotImplementedError()


class NYStyleCheesePizza(Pizza):
    def __init__(self, pizza_ingredient_factory):
        super(NYStyleCheesePizza, self).__init__()
        self.ingredientFactory = pizza_ingredient_factory

    def prepare(self):
        self.dough = self.ingredientFactory.create_dough()
        self.sauce = self.ingredientFactory.create_sauce()
        self.cheese = self.ingredientFactory.create_cheese()

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


class PizzaIngredientFactory(object):
    def create_dough(self):
        raise NotImplementedError()

    def create_sauce(self):
        raise NotImplementedError()

    def create_cheese(self):
        raise NotImplementedError()

    def create_veggies(self):
        raise NotImplementedError()

    def create_pepperoni(self):
        raise NotImplementedError()

    def create_clam(self):
        raise NotImplementedError()


class NYPizzaIngredientFactory(PizzaIngredientFactory):
    def __init__(self):
        super(NYPizzaIngredientFactory, self).__init__()

    def create_dough(self):
        return ThinCrustDough()

    def create_sauce(self):
        return MarinaraSauce()

    def create_cheese(self):
        return ReggianoCheese()

    def create_veggies(self):
        return [Garlic(), Onion(), Mushroom(), RedPepper()]

    def create_pepperoni(self):
        return SlicedPepperoni()

    def create_clam(self):
        return FreshClams()

