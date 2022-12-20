# github SSH免密码登录

## 什么是SSH

SSH是一种常见的登录协议，使用SSH的好处是不用在下载或者上传代码时，每次都输入账号密码。

## 配置SSH连接github

!!! note "可参考<https://docs.github.com/cn/github/authenticating-to-github/connecting-to-github-with-ssh>"

具体步骤如下：

* 本地生成密钥对

* 将公钥添加到github

* 测试使用

### 本地生成密钥对

使用命令：

``` shell
ssh-keygen -t rsa -b 4096 -C "最好为github的账号"
```

后面一路直接回车,接着就在（用户/.ssh）目录下生成了两个文件

* id_rsa是私钥文件
* id_rsa.pub是公钥文件

### 将公钥添加到github

打开github，点击个人页面的头像，点击`Settings`，然后点击 `SSH and GPG keys`，接下来点击`New SSH Key`，打开刚刚在本地生成的`id_rsa.pub`文件，将里面的所有内容复制到对话框中。最终点击`Add SSH Key`按钮 就能成功添加啦

### 测试使用

使用命令：

``` shell
ssh -T git@github.com
```

检验是否配置成功

!!! note "第一次连接，会有提示是否信任github服务器，我们需要输入yes"
