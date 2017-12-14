from abc import ABCMeta, abstractmethod

__author__ = 'bryson'


class State(object):
    __metaclass__ = ABCMeta

    @abstractmethod
    def insert_quarter(self):
        pass

    @abstractmethod
    def eject_quarter(self):
        pass

    @abstractmethod
    def turn_crank(self):
        pass

    @abstractmethod
    def dispense(self):
        pass


class NoQuarterState(State):
    def __init__(self, gumball_machine):
        self.gumball_machine = gumball_machine

    def insert_quarter(self):
        print("You inserted a quarter")
        self.gumball_machine.set_state(self.gumball_machine.get_has_quarter_state())

    def eject_quarter(self):
        print("You haven't inserted a quarter")

    def turn_crank(self):
        print("You turned, but there's no quarter")

    def dispense(self):
        print("You need to pay first")


class GumballMachine(object):
    def __init__(self, number_gumballs):
        self.noQuarterState = NoQuarterState(self)
        self.soldOutState = SoldOutState()
        self.hasQuarterState = HasQuarterState()
        self.soldState = SoldState()
        self.count = number_gumballs
        if number_gumballs > 0:
            self.state = self.noQuarterState