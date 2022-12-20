# 单例模式：从 naive 到工业级

## 什么是单例模式

在实际场景中，经常有 “某个类只能有一个实例化对象” 的需求。如全屏游戏运行时应该只有一个窗口、系统日志由一个日志管理器统一记录。

《设计模式》一书中，给出了单例模式的简单实现：

```c++
// singleton.h
class CSingleton {
public:
    static CSingleton* Instance() {
        if (_instance == nullptr) {
            _instance = new CSingleton;
        }
        return _instance;
    }
    //该类的其它接口 ...
protected:
    CSingleton() {}
private:
    static CSingleton* _instance;
};

// singleton.cpp
CSingleton* CSingleton::_instance;
```

它的实现要点是：

1. 将构造函数设置为非 public 的权限
2. 使用一个类静态成员保存唯一的实例
3. 实现一个 public 的静态方法，用于获取唯一的对象实例

但是，这种示例代码，仍然有一些缺陷。比如拷贝构造、移动构造还未delete，所以用户可能有其它方式构造对象实例。不过，这个相信大家都会自己注意和修改。

更重要的是，它还其它缺陷，满足不了工业级的需求：

1. 不同的类想要变成单例，都需要重复添加 `Instance` 方法及静态成员，比较冗余。
2. 不能处理一个类的构造存在重载的情况。更没有办法统一优雅地解决不同类的构造函数的参数个数、参数类型可能不同的问题。这个版本直接回避了这个问题，举例用的是无参构造。
3. 无法精确控制单例对象的顺序依赖关系。比如建建学校，要先有校长。这就必需保证校长在学校构造前已经被实例化。
但是这个朴素版本，把创建对象和获取对象的逻辑放在了一起，无法精确控制单例的生命周期。

我们看看 OneFlow 中是怎么克服以上缺陷的。

## OneFlow 中的工业级单例模式

OneFlow 的单例模式代码在 [global.h](https://github.com/Oneflow-Inc/oneflow/blob/master/oneflow/core/common/global.h) 中。它的核心代码如下（我简化了和异常处理、错误检查等代码）：

```c++
template<typename T>
class Global final {
public:
    static T* Get() {
        return *GetPPtr();
    }

    template<typename... Args>
    static void New(Args&&... args) {
        CHECK(Get() == nullptr); //不为 nullptr 将抛异常
        *GetPPtr() = new T(std::forward<Args>(args)...);
    }

    static void Delete() {
        if (Get() != nullptr) {
            delete Get();
            *GetPPtr() = nullptr;
        }
    }
private:
    static T** GetPPtr() {
        static T* ptr = nullptr;
        return &ptr;
    }
};
```

我们看到，它提供了三个重要的公开方法：`New`、`Get`、`Delete`。其中 `New` 是用来实例化单例、`Delete` 用来销毁单例、`Get` 用来获取全局唯一的单例对象。

我们看到，与之前朴素版本的单例模式相比，`Global` 专门设计了 `New` 接口和 `Delete` 接口。它的好处在于，不再把单例对象的生命周期管理交给运行时和编译器。而是可以非常精确地控制单例对象的生命周期。

比如这里的代码，这个线程池单例，就依赖了 `ResourceDesc` 单例。因为可以精确控制生命周期，我们可以确保线程池实例化时，`ResourceDesc` 已经存在了。

```c++
Global<ThreadPool>::New(Global<ResourceDesc, ForSession>::Get()->ComputeThreadPoolSize());
```

### New 接口实现

我们看看 `New` 接口的实现。已经掌握了完美转发和变参模板的同学，可以很容易看懂，这里就是做了一个完美转发，
并且支持任意个数、任意类型参数的转发。这使得 `OneFlow` 的单例非常灵活，可以用 `New` 接口统一地创建各种各样的类。

```c++
template<typename... Args>
static void New(Args&&... args) {
    CHECK(Get() == nullptr); //不为 nullptr 将抛异常
    *GetPPtr() = new T(std::forward<Args>(args)...);
}
```

不过创建好的对象放哪去了呢？这和方法 `GetPPtr` 有关系。读懂 `GetPPtr` 的实现，牵涉到二级指针的使用技巧。

```c++
static T** GetPPtr() {
    static T* ptr = nullptr;
    return &ptr;
}
```

熟悉命名规范的同学知道，其实 `GetPPtr` 的名字就暗示了它和二级指针有关。我们看 `GetPPtr` 中，准备了一个静态变量，它是一个指针。但是这个函数并不是直接返回这个静态变量。而是返回这个变量的地址。因此这个函数的返回类型是 **二级指针**。

而实例化对象的过程，就需要先定位到这个静态变量。然后把创建的对象地址给放进去。

```c++
*GetPPtr() = new T(std::forward<Args>(args)...);
```

获取单例时也类似，是先通过 `GetPPtr` 定位到了那个静态变量。然后通过解引用，得到静态变量中的内容，也就是单例对象的地址。

```c++
static T* Get() { return *GetPPtr(); }
```

### 单例的同步问题

在不少单例模式的示范中，都喜欢在单例设计中，**统一处理多线程同步问题**。其实这很容易带来性能的损失。实际上，同步问题和单例模式是2个独立的问题，最好不要将他们混为一谈。同步问题应该是具体情况具体对待的。

以 `OneFlow` 为例，所有 `Global` 单例对象的创建和销毁都在主线程里，并不存在并发，这样就不需要特别的同步操作。在 `OneFlow` 这种情况下，如果 `Global` 单例类中的某一个成员存在并发问题，那就单独对那个成员加锁解决就可以了。在通常的编程实践中，锁的粒度要尽可能小。

## 总结

总结起来，`OneFlow` 这种工业级代码里的单例模式有以下优势：

1. 任意一个类都可以通过 `Global` 模板成为单例
2. 可以用统一的 `New` 接口创建各种类单例、并支持构造重载
3. 可以精确地控制单例对象的生命周期和依赖关系
4. 把细粒度地解决同步问题的权力交给了开发者
