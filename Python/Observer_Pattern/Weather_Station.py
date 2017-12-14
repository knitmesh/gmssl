__author__ = 'bryson'


class Event(object):
    pass


class Observable(object):
    def __init__(self):
        self.callbacks = []

    def subscribe(self, callback):
        self.callbacks.append(callback)

    def unsubscribe(self, callback):
        self.callbacks.remove(callback)

    def notify(self, **attributes):
        event = Event()
        event.source = self
        for key, value in attributes.iteritems():
            setattr(event, key, value)
        for function in self.callbacks:
            function(event)


class Observer(object):
    def update(self, event):
        raise NotImplementedError()


class WeatherData(Observable):
    def __init__(self):
        super(WeatherData, self).__init__()
        self.temperature = None
        self.humidity = None
        self.pressure = None

    def set_measurements(self, temperature, humidity, pressure):
        self.temperature = temperature
        self.humidity = humidity
        self.pressure = pressure


class CurrentConditionsDisplay(Observer):
    def __init__(self, observable):
        self.temperature = None
        self.humidity = None
        self.weatherData = observable

        self.weatherData.subscribe(self.update)

    def update(self, event):
        print "Temperature:", event.temperature

    def unsubscribe(self):
        self.weatherData.unsubscribe(self.update)


weather_data = WeatherData()
display1 = CurrentConditionsDisplay(weather_data)
display2 = CurrentConditionsDisplay(weather_data)
weather_data.notify(temperature="20")
display1.unsubscribe()
weather_data.notify(temperature="21")