同样用选择性搜索算法来提取RoI，但是参考SPPnet将计算卷积的操作合并为了一个。分类任务不采用SVM分类器，改用全连接层FC。这篇论文主要探讨的是如何加快训练过程，并没有进行特别大的改进，当然比RCNN还是快了许多，RCNN的卷积操作包含太多的重复运算。