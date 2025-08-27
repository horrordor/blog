# 基本思路

所谓的物理神经网络, 其实就是把物理方程作为限制加入神经网络中使训练的结果满足物理规律. 而这个所谓的限制是怎么实现的？其实就是通过把物理方程的迭代前后的差值加到神经网络的损失函数里面去, 让物理方程也“参与”到了训练过程. 这样, 神经网络在训练迭代时候优化的不仅仅是网络自己的损失函数, 还有物理方程每次迭代的差, 使得最后训练出来的结果就满足物理规律了. 

# Deep Lagrangian Networks (DeLaN)

## 机器人科学的正问题与逆问题

- 正问题：已知机器人各个关节处电机的驱动力, 预测机械臂最终到达的位置, 动量和加速度. 
- 逆问题：为了将机械臂移动到指定位置且拥有指定的动量和加速度(比如想以某个角度某种力度打脸), 机器人各个关节处电机驱动力需要如何分配. 

正问题和逆问题的数学表达式如下, 
正问题: $f(\mathbf{q}, \:\dot{\mathbf{q}}, \:\textbf{τ}) = \ddot{\mathbf{q}}$
逆问题: $f^{-1}(\mathbf{q}, \:\dot{\mathbf{q}}, \:\ddot{\mathbf{q}}) = \textbf{τ}$

其中$\mathbf{q}$表示坐标, $\dot{\mathbf{q}}$表示速度, $\dot{\mathbf{q}}$ 表示加速度, $\textbfτ$ 表示电机驱动力. 

如果使用传统的深度学习, 解决机器人的逆问题, 可能会出现意想不到的问题, 就算训练数据满足所有的物理规律, 训练好的人工神经网络仍然可能做出非物理的预测.

此外, 有一些场景不适用刚体运动学, 甚至很难用物理公式计算, 比如下面这些场景, 

- 柔性关节, 关节之间用弹簧或绳子连接, 而弹性系数并无数值
- 流体身躯, 体内有半满的液体, 内部质量分布随身躯的姿态而变化
- 摩擦力
    - 关节之间存在静摩擦力与动摩擦力
    - 脚底与地面之间存在静摩擦力与动摩擦力


这篇文章将欧拉拉格朗日方程中的物体质量矩阵用神经网络表示, 从而可以估计质量分布与机器人姿态之间的关系; 将机器人各部分受到的力(比如万有引力, 弹簧拉力, 关节摩擦力, 以及与地面的摩擦力), 用神经网络表示, 解决柔性关节与摩擦力不好理论计算的难题. 

## 具体实现

在力学建模中, 拉格朗日量定义为动能减去势能, 即

$$ L=T-V $$

其中T是动能项, V是势能项. 文章中动能写成$T = \frac{1}{2} \dot{\mathbf{q}}^{T} \mathbf{H}(\mathbf{q}) \dot{\mathbf{q}}$的形式, 其中$\mathbf{H}(\mathbf{q})$是与坐标相关的质量矩阵, $\dot{\mathbf{q}}$是速度. 势能与引力, 弹簧的拉力等相关, 力 g(q) 与势能的关系是$g(q)=-\frac{dV}{dq}$.

应用变分微积分得到欧拉-拉格朗日方程, 其非保守力描述为:

$$\frac{d}{dt} \frac{\partial L}{\partial \dot{\mathbf{q}}_{i}} - \frac{\partial L}{\partial \mathbf{q}_i} = \mathbf{\tau}_{i}$$

如果右边的$\mathbf{\tau}_{i}=0$, 上面这个方程就是常见的没有外力的拉格朗日方程. 加了$\mathbf{\tau}_{i}$, 表示这个系统有电机的驱动力输入. 

将动能和势能带入欧拉-拉格朗日方程中:

$$ \mathbf{H}(\mathbf{q}) \ddot{\mathbf{q}} + \underbrace{\dot{\mathbf{H}}(\mathbf{q}) \dot{\mathbf{q}} - \frac{1}{2} \left( \frac{\partial}{\partial \mathbf{q}} \left( \dot{\mathbf{q}}^{T} \mathbf{H}(\mathbf{q}) \dot{\mathbf{q}} \right) \right)^{T}}_{:=\mathbf{c}(\mathbf{q}, \dot{\mathbf{q}})} + \: \mathbf{g}(\mathbf{q}) = \mathbf{\tau}$$

然后将质量矩阵写成半正定的神经网络表示, 将势能对应的力也用神经网络表示:

$$\hat H(\mathbf{q}) = \hat L(\mathbf{q} \: ; \:\theta) \hat L(\mathbf{q} \: ; \:\theta)^{T} \hspace{15pt} \hat g(\mathbf{q}) = \hat g(\mathbf{q} \: ; \: \psi)$$

L是下三角矩阵, 从构造上让质量矩阵半正定(使用 ReLU 激活函数 ReLU(x) = max(0,x) 为L矩阵添加大于等于零的对角元). $\theta$和$\psi$是神经网络参数. 此时逆问题变成了:

$$\hat{f}^{-1}(\mathbf{q}, \:\dot{\mathbf{q}}, \:\ddot{\mathbf{q}} \:; \: \theta, \:\psi) = \tau$$

训练的优化目标定为最小化$\hat{f}^{-1}$和$\tau$之间的距离:

$$
\left(\theta^{*}, \: \psi^{*} \right) = \arg_{\theta, \psi}min \hspace{5pt} \ell \left( \hat{f}^{-1}(\mathbf{q}, \dot{\mathbf{q}}, \ddot{\mathbf{q}} \:; \: \theta, \psi), \:\:\textbf{τ} \right) $$

## 总结

深度拉格朗日网络学会了力学系统的运动方程, 比传统的前馈神经网络训练速度更快, 预测结果更物理, 对新的径迹预测也更健壮. 

# PINN-based MPC

传统非线性动力学方法在计算效率、模型适应性、数据需求和实时控制能力上的局限, 而PINN本身是对微分方程(或偏微分方程)进行求解的一种方法, 不适用于control task. 

PINN计算偏微分方程速度快, 所以用PINN代替传统非线性动力学, 并通过采样策略和零保持假设来减少高维输入空间; 通过加入control actions和initial conditions使PINN能够完成control task.

## 具体实现

非线性模型预测控制(NMPC, Nonlinear Model Predictive Control)的核心思想是: 在每个控制周期内, 基于当前的系统状态和预测模型，预测未来多个时刻的系统行为，然后通过优化未来一段时间的控制输入序列来最小化某种代价函数，通常是跟踪误差或能量消耗。尽管 MPC 预测多个时刻的控制输入，但它只实施当前时刻的输入，并在下一时刻重新计算。这种方法可以让控制系统在面对复杂或非线性环境时，始终根据最新状态做出最优决策，兼顾性能和约束条件。

连续时间系统可表示为：

$$\dot{\textbf{x}}(t) = f(\textbf{x}(t), \textbf{u}(t))$$

在等间隔时间网格$t_k = k\tau + t_0$上离散化，得到：

$$
\textbf{x}_{k+1} = \textbf{φ}(\tau, \textbf{u}_k, \textbf{x}_k)
$$

其中 $\textbf{φ}$ 是系统的流映射(flow map)，表示从 $t_k$ 到 $t_{k+1}$ 的状态演化。

在每个时刻 $t_\rho$, MPC优化问题即求解如下有限时域最优控制问题：

$$
\min_{\textbf{u}_{\rho},\dots,\textbf{u}_{\rho+H-1}} \sum_{k=\rho}^{\rho+H-1} \ell(\textbf{x}_k^{\text{ref}}, \textbf{x}_k, \textbf{u}_k)
$$

约束为：

$$
\textbf{x}_{k+1} = \textbf{φ}(\tau, \textbf{u}_k, \textbf{x}_k), \quad \textbf{u}_k \in \mathcal{U}, \quad \textbf{x}_k \in \mathcal{X}
$$

其中 $\ell$ 是损失函数，通常为：

$$
\ell(\textbf{x}_k^{\text{ref}}, \textbf{x}_k, \textbf{u}_k) = \|\textbf{x}_k^{\text{ref}} - \textbf{x}_k\|^2_Q + \|\textbf{u}_k\|^2_R
$$

考虑机械臂的拉格朗日力学运动方程(偷懒了和上文没有统一符号,TBD)，其标准形式为：

$$
\textbf{M}(\textbf{q})\ddot{\textbf{q}} + \textbf{k}(\textbf{q}, \dot{\textbf{q}}) = \textbf{h}(\textbf{q}, \dot{\textbf{q}}) + \textbf{B}\textbf{u}
$$

其中：$\textbf{q} = [\alpha, \beta]^\top$ 是广义坐标(两个关节的角度), $\dot{\textbf{q}}$ 是广义速度(角速度), $\ddot{\textbf{q}}$ 是广义加速度(角加速度), $\textbf{M}(\textbf{q})$ 是质量矩阵(正定、对称), $\textbf{k}(\textbf{q}, \dot{\textbf{q}})$ 包含科里奥利力、离心力和重力项, $\textbf{h}(\textbf{q}, \dot{\textbf{q}})$ 是施加的外力(如摩擦力), $\textbf{B}$ 是输入矩阵, $\textbf{u}$ 是控制输入(电机电流). 在大多数标准机械臂中，每个电机直接驱动一个关节，此时输入矩阵 $\textbf{B}$ 就是电机的扭矩常数矩阵 ${K}_m$。

为了将其转化为标准的一阶常微分方程组(便于数值积分和PINN处理)：

$$
\textbf{x} = \begin{bmatrix} \textbf{q} \\ \dot{\textbf{q}} \end{bmatrix} = \begin{bmatrix} q_1 \\ q_2 \\ \dot{q}_1 \\ \dot{q}_2 \end{bmatrix}
$$

对状态向量求导：

$$
\dot{\textbf{x}} = \begin{bmatrix} \dot{\textbf{q}} \\ \ddot{\textbf{q}} \end{bmatrix}
$$

我们的目标是将 $\dot{\textbf{x}}$ 表达为状态 $\textbf{x}$ 和控制输入 $\textbf{u}$ 的函数，即 $\dot{\textbf{x}} = f(\textbf{x}, \textbf{u})$。

从原始运动方程出发，解出 $\ddot{\textbf{q}}$：

$$
\ddot{\textbf{q}} = \textbf{M}^{-1}(\textbf{q}) \left[ \textbf{h}(\textbf{q}, \dot{\textbf{q}}) + \textbf{B}\textbf{u} - \textbf{k}(\textbf{q}, \dot{\textbf{q}}) \right]
$$

因此，整个状态空间方程可以写为：

$$
\dot{\textbf{x}} = \frac{d}{dt} \begin{bmatrix} \textbf{q} \\ \dot{\textbf{q}} \end{bmatrix} = \begin{bmatrix} \dot{\textbf{q}} \\ \textbf{M}^{-1}(\textbf{q}) \left[ \textbf{h}(\textbf{q}, \dot{\textbf{q}}) + \textbf{B}\textbf{u} - \textbf{k}(\textbf{q}, \dot{\textbf{q}}) \right] \end{bmatrix} =: f(\textbf{x}, \textbf{u})
$$

PINN的核心思想不是直接学习解，而是学习满足微分方程的函数。因此，我们将控制方程重写为残差形式。定义残差向量 $\textbf{F}$：

$$
\textbf{F}(\textbf{x}, \dot{\textbf{x}}, \textbf{u}) = \dot{\textbf{x}} - f(\textbf{x}, \textbf{u})
$$

一个物理上真实的轨迹必须满足 $\textbf{F} = 0$。将 $f(\textbf{x}, \textbf{u})$ 代入：

$$
\textbf{F}(\textbf{x}, \dot{\textbf{x}}, \textbf{u}) = \begin{bmatrix} \dot{\textbf{q}} - \dot{\textbf{q}} \\ \ddot{\textbf{q}} - \left( \textbf{M}^{-1}(\textbf{q}) \left[ \textbf{h}(\textbf{q}, \dot{\textbf{q}}) + \textbf{B}\textbf{u} - \textbf{k}(\textbf{q}, \dot{\textbf{q}}) \right] \right) \end{bmatrix} = \begin{bmatrix} \textbf{0} \\ \ddot{\textbf{q}} - \left( \textbf{M}^{-1}(\textbf{q}) \left[ \textbf{h}(\textbf{q}, \dot{\textbf{q}}) + \textbf{B}\textbf{u} - \textbf{k}(\textbf{q}, \dot{\textbf{q}}) \right] \right) \end{bmatrix}
$$

这个残差也可以写成更紧凑的DAE形式：

$$
\textbf{0} = \begin{bmatrix} \textbf{I} & \textbf{0} \\ \textbf{0} & \textbf{M}(\textbf{q}) \end{bmatrix} \begin{bmatrix} \dot{\textbf{q}} \\ \ddot{\textbf{q}} \end{bmatrix} - \begin{bmatrix} \dot{\textbf{q}} \\ \textbf{h}(\textbf{q}, \dot{\textbf{q}}) - \textbf{k}(\textbf{q}, \dot{\textbf{q}}) \end{bmatrix} - \begin{bmatrix} \textbf{0} \\ \textbf{B}\textbf{u} \end{bmatrix}
$$

这等价于我们上面推导出的残差方程 $\textbf{F} = 0$。


现在，我们用神经网络 $\widehat{\textbf{φ}}$ 来近似系统的流映射。该网络以时间 $t$、初始状态 $\textbf{x}_0$ 和控制输入 $\textbf{u}$ 为输入，输出预测状态 $\widehat{\textbf{x}}(t)$。

$$
\widehat{\textbf{x}}(t) = \widehat{\textbf{φ}}(t, \textbf{x}_0, \textbf{u}; \textbf{ω}) \approx \textbf{x}(t)
$$

为了将物理规律嵌入网络，我们要求网络的预测 $\widehat{\textbf{x}}(t)$ 必须尽可能满足残差方程 $\textbf{F} = 0$。


将网络的预测值 $\widehat{\textbf{x}} = [\widehat{\textbf{q}}, \dot{\widehat{\textbf{q}}}]^\top$ 和其导数(使用AutoDiff计算) $\dot{\widehat{\textbf{x}}} = [\dot{\widehat{\textbf{q}}}, \ddot{\widehat{\textbf{q}}}]^\top$ 代入我们预先已知的物理残差函数 $\textbf{F}$ 中：

$$
\widehat{\textbf{F}} = \textbf{F}(\widehat{\textbf{x}}, \dot{\widehat{\textbf{x}}}, \textbf{u}) = \dot{\widehat{\textbf{x}}} - f(\widehat{\textbf{x}}, \textbf{u})
$$

具体来说，就是代入质量矩阵 $\textbf{M}$、力向量 $\textbf{k}$ 和 $\textbf{h}$ 等 **已知的物理模型** 中。

物理损失函数旨在最小化这个预测残差。在大量采集点 $(t_i, \textbf{x}_{0,i}, \textbf{u}_i)$ 上计算残差并求平均：

$$
L_{\text{phys}}(\textbf{ω}) = \frac{1}{N_{\text{phys}}} \sum_{i=1}^{N_{\text{phys}}} \| \widehat{\textbf{F}}(t_i, \textbf{x}_{0,i}, \textbf{u}_i, \textbf{ω}) \|^2
$$

通过最小化 $L_{\text{phys}}$，我们强制神经网络的输出 $\widehat{\textbf{x}}(t)$ 遵守已知的物理定律(运动方程)。


$$
\widehat{\textbf{x}}_{k+1} = \widehat{\textbf{φ}}(\tau, \textbf{u}_k, \textbf{x}_k; \textbf{ω})
$$


若有真实数据监督数据,还可以额外添加数据损失：

$$
L_{\text{data}}(\textbf{ω}) = \frac{1}{N_{\text{data}}} \sum_{i=1}^{N_{\text{data}}} \|\widehat{\textbf{φ}}(t_i, \textbf{x}_{0,i}, \textbf{u}_i; \textbf{ω}) - \textbf{x}_i\|^2
$$


总损失为：

$$
L(\textbf{ω}) = L_{\text{data}}(\textbf{ω}) + L_{\text{phys}}(\textbf{ω})
$$


假设在每个区间 $[k\tau, (k+1)\tau]$ 上控制输入 $\textbf{u}(t)$ 为常数，即：

$$
\textbf{u}(t) = \textbf{u}_k \quad \text{for } t \in [k\tau, (k+1)\tau]
$$

这使得输入空间从无限维降为有限维，便于采样和训练。

对于超过一个时间步的预测，使用：

$$
\widehat{\textbf{x}}_{k+1} = \widehat{\textbf{φ}}(\tau, \textbf{u}_k, \widehat{\textbf{x}}_k; \textbf{ω})
$$

即用当前预测值作为下一步的初始状态，逐步推进。


## 总结

使用一个被物理定律“约束”过的神经网络 $\widehat{\textbf{φ}}$预测机械臂的状态演化，从而替代传统的数值积分器，用于快速的模型预测控制(MPC)。