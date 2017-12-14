from functools import wraps

__author__ = 'bryson'


def tags(tag_name):
    def tags_decorator(func):
        @wraps(func)
        def func_wrapper(name):
            return "<{0}>{1}></{0}>".format(tag_name, func(name))
        return func_wrapper
    return tags_decorator


@tags("p")
def get_text(name):
    return "Hello " + name

print get_text("Bryson")