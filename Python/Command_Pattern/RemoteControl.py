__author__ = 'bryson'

from abc import ABCMeta, abstractmethod


class RemoteControl(object):
    def __init__(self):
        self.onCommands = []
        self.offCommands = []
        self.undoCommand = NoCommand()

        noCommand = NoCommand()
        for i in range(0, 8):
            self.onCommands[i] = noCommand
            self.offCommands[i] = noCommand

    def setCommand(self, slot, on_command, off_command):
        self.onCommands[slot] = on_command
        self.offCommands[slot] = off_command

    def on_button_was_pushed(self, slot):
        self.onCommands[slot].execute()
        self.undoCommand = self.onCommands[slot]

    def off_button_was_pushed(self, slot):
        self.offCommands[slot].execute()
        self.undoCommand = self.offCommands[slot]

    def undo_button_was_pushed(self):
        self.undoCommand.undo()


class Command(object):
    __metaclass__ = ABCMeta

    @abstractmethod
    def execute(self):
        """Method Documentation"""
        return

    @abstractmethod
    def undo(self):
        return


class LightOffCommand(Command):
    def __init__(self, light):
        self.light = light

    def execute(self):
        self.light.off()

    def undo(self):
        self.light.on()


class StereoOnWithCDCommand(Command):
    def __init__(self, stereo):
        self.stereo = stereo

    def execute(self):
        self.stereo.on()
        self.stereo.setCD()
        self.stereo.setVolume(11)

    def undo(self):
        self.stereo.off()


class NoCommand(Command):
    def execute(self):
        return

    def undo(self):
        return


class MacroCommand(Command):
    def __init__(self, commands):
        self.commands = commands

    def execute(self):
        for command in self.commands:
            command.execute()

    def undo(self):
        for command in self.commands:
            command.undo()

