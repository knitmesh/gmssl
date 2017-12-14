__author__ = 'bryson'


class Character(object):
    def fight(self):
        raise NotImplementedError()


def knife_behaviour():
    print "attacks with knife!"


def bow_and_arrow_behaviour():
    print "attacks with arrows!"


def axe_behaviour():
    print "attacks with axe!"


def sword_behaviour():
    print "attacks with sword!"


# noinspection PyAbstractClass
class King(Character):
    def __init__(self):
        self.fight = knife_behaviour


# noinspection PyAbstractClass
class Queen(Character):
    def __init__(self):
        self.fight = bow_and_arrow_behaviour


# noinspection PyAbstractClass
class Knight(Character):
    def __init__(self):
        self.fight = sword_behaviour


# noinspection PyAbstractClass
class Troll(Character):
    def __init__(self):
        self.fight = axe_behaviour


king = King()
queen = Queen()
knight = Knight()
troll = Troll()

king.fight()
queen.fight()
knight.fight()
troll.fight()