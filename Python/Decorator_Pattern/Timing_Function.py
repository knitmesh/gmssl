import time

__author__ = 'bryson'


def timing_function(some_function):

    """
    Outputs the time a function takes to execute.
    :param some_function: the function to be timed
    """

    def wrapper():
        t1 = time.time()
        some_function()
        t2 = time.time()
        return "Time it took to run the function: " + str((t2-t1)) + "\n"
    return wrapper


@timing_function
def my_function():
    num_list = []
    for x in range(0, 10000):
        num_list.append(x)
    print "Sum of all the numbers: " + str(sum(num_list))


print my_function()