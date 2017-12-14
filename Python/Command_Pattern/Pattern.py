__author__ = 'bryson'

from abc import abstractmethod, ABCMeta

"""
The Command Pattern encapsulates a request as an object, thereby letting you parameterize other objects with different
requests, queue or log requests, and support undoable operations.
"""


class Command(object):
    __metaclass__ = ABCMeta

    @abstractmethod
    def execute(self):
        """Method Documentation"""
        return


class LightOnCommand(Command):
    def __init__(self, light):
        self.light = light

    def execute(self):
        self.light.on()


class SimpleRemoteControl(object):
    def __init__(self):
        self.slot = None

    def set_command(self, command):
        self.slot = command

    def button_was_pressed(self):
        self.slot.execute()