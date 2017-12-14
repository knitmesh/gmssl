__author__ = 'bryson'


class Beverage(object):
    def __init__(self):
        self.description = "Unknown Beverage"

    def get_description(self):
        return self.description

    def cost(self):
        raise NotImplementedError()


class CondimentDecorator(Beverage):
    def get_description(self):
        raise NotImplementedError()

    def cost(self):
        raise NotImplementedError()


class Espresso(Beverage):
    def __init__(self):
        super(Espresso, self).__init__()
        self.description = "Espresso"

    def cost(self):
        return 1.99


class HouseBlend(Beverage):
    def __init__(self):
        super(HouseBlend, self).__init__()
        self.description = "House Blend Coffee"

    def cost(self):
        return 0.89


class Mocha(CondimentDecorator):
    def __init__(self, beverage):
        super(Mocha, self).__init__()
        self.beverage = beverage

    def get_description(self):
        return self.beverage.get_description() + ", Mocha"

    def cost(self):
        return 0.20 + self.beverage.cost()


beverage = Mocha(Mocha(Espresso()))
print beverage.get_description()
print beverage.cost()


