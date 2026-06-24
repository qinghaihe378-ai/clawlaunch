// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ClawLaunchRouterProxy
 * @dev 纯链上的前端代理路由，负责：接收资金 -> 扣手续费 -> 实时返佣 -> 调用 PancakeSwap -> 返回代币给用户
 */

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPancakeRouter02 {
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin, address[] calldata path, address to, uint deadline
    ) external payable;

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline
    ) external;

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline
    ) external;
}

contract ClawLaunchRouterProxy {
    address public owner;
    address public feeReceiver; // 官方收手续费的金库钱包
    IPancakeRouter02 public pancakeRouter; // 底层真正的 Pancake Router 地址

    // 费率设置 (10000 为基数)
    uint256 public feeRate = 40;          // 40 / 10000 = 0.4% 的总交易手续费
    
    // 返佣比例设置
    uint256 public initialReferrerShare = 8000; // 前三个月 80%
    uint256 public defaultReferrerShare = 5000; // 三个月后 50%
    uint256 public launchTime;                  // 合约上线/启动的时间戳

    // 防重入锁
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor(address _router, address _feeReceiver) {
        require(_router != address(0), "Invalid router address");
        require(_feeReceiver != address(0), "Invalid fee receiver");
        owner = msg.sender;
        pancakeRouter = IPancakeRouter02(_router);
        feeReceiver = _feeReceiver;
        launchTime = block.timestamp; // 记录合约部署那一刻的时间
        _status = _NOT_ENTERED;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ==========================================
    // 1. 用 BNB 买代币 (ETH -> Token)
    // ==========================================
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline,
        address referrer // <-- 前端多传一个邀请人地址
    ) external payable nonReentrant {
        require(msg.value > 0, "Zero amount");
        require(path.length >= 2, "Invalid path");

        // 1. 计算手续费
        uint256 fee = (msg.value * feeRate) / 10000;
        uint256 swapAmount = msg.value - fee;

        // 2. 实时分发手续费和返佣
        _distributeETHFee(fee, referrer);

        // 3. 拿着剩下的钱去 Pancake 买币
        pancakeRouter.swapExactETHForTokensSupportingFeeOnTransferTokens{value: swapAmount}(
            amountOutMin, path, to, deadline
        );
    }

    // ==========================================
    // 2. 卖代币换 BNB (Token -> ETH)
    // ==========================================
    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline,
        address referrer
    ) external nonReentrant {
        require(amountIn > 0, "Zero amount");
        require(path.length >= 2, "Invalid path");

        // 1. 把用户的代币收到这个代理合约里
        // 注意：如果是通缩代币，实际收到的可能少于 amountIn，需要查余额差值
        uint256 balanceBefore = IERC20(path[0]).balanceOf(address(this));
        require(IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn), "Transfer failed");
        uint256 actualAmountIn = IERC20(path[0]).balanceOf(address(this)) - balanceBefore;

        // 2. 计算手续费
        uint256 fee = (actualAmountIn * feeRate) / 10000;
        uint256 swapAmount = actualAmountIn - fee;

        // 3. 实时分发代币手续费
        _distributeTokenFee(path[0], fee, referrer);

        // 4. 授权给 Pancake Router 并去卖币
        _approveTokenIfNeeded(path[0], address(pancakeRouter), swapAmount);
        pancakeRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            swapAmount, amountOutMin, path, to, deadline
        );
    }

    // ==========================================
    // 3. 代币换代币 (Token -> Token)
    // ==========================================
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline,
        address referrer
    ) external nonReentrant {
        require(amountIn > 0, "Zero amount");
        require(path.length >= 2, "Invalid path");

        uint256 balanceBefore = IERC20(path[0]).balanceOf(address(this));
        require(IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn), "Transfer failed");
        uint256 actualAmountIn = IERC20(path[0]).balanceOf(address(this)) - balanceBefore;

        uint256 fee = (actualAmountIn * feeRate) / 10000;
        uint256 swapAmount = actualAmountIn - fee;

        _distributeTokenFee(path[0], fee, referrer);

        _approveTokenIfNeeded(path[0], address(pancakeRouter), swapAmount);
        pancakeRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            swapAmount, amountOutMin, path, to, deadline
        );
    }

    // ==========================================
    // 内部方法：安全授权
    // ==========================================
    function _approveTokenIfNeeded(address token, address spender, uint256 amount) internal {
        // 防止有些代币（如 USDT）要求 allowance 必须先清零才能重新授权
        IERC20(token).approve(spender, 0);
        require(IERC20(token).approve(spender, amount), "Approve failed");
    }

    // ==========================================
    // 内部方法：获取当前应执行的返佣比例
    // ==========================================
    function getCurrentReferrerShare() public view returns (uint256) {
        // 90 天 = 90 * 24 * 60 * 60 = 7776000 秒
        if (block.timestamp <= launchTime + 7776000) {
            return initialReferrerShare; // 前三个月 80%
        } else {
            return defaultReferrerShare; // 三个月后 50%
        }
    }

    // ==========================================
    // 内部方法：分钱逻辑
    // ==========================================
    function _distributeETHFee(uint256 fee, address referrer) internal {
        if (fee == 0) return;
        // 如果有邀请人，并且邀请人不是自己
        if (referrer != address(0) && referrer != msg.sender) {
            uint256 currentShare = getCurrentReferrerShare();
            uint256 refFee = (fee * currentShare) / 10000;
            uint256 adminFee = fee - refFee;
            
            // 使用 call 进行 ETH 转账，防止接收方是合约时消耗超 Gas 失败
            (bool successRef, ) = payable(referrer).call{value: refFee}("");
            if(!successRef) adminFee += refFee; // 如果转给推荐人失败，钱归官方，不中断交易

            (bool successAdmin, ) = payable(feeReceiver).call{value: adminFee}("");
            require(successAdmin, "Admin ETH transfer failed");
        } else {
            // 没邀请人，全归官方
            (bool successAdmin, ) = payable(feeReceiver).call{value: fee}("");
            require(successAdmin, "Admin ETH transfer failed");
        }
    }

    function _distributeTokenFee(address token, uint256 fee, address referrer) internal {
        if (fee == 0) return;
        if (referrer != address(0) && referrer != msg.sender) {
            uint256 currentShare = getCurrentReferrerShare();
            uint256 refFee = (fee * currentShare) / 10000;
            uint256 adminFee = fee - refFee;
            
            // 尝试转给推荐人，如果不检查返回值直接 require，可能会因为恶意推荐人地址导致交易回滚
            bool successRef = IERC20(token).transfer(referrer, refFee);
            if(!successRef) adminFee += refFee; // 失败则转给官方

            require(IERC20(token).transfer(feeReceiver, adminFee), "Admin token transfer failed");
        } else {
            require(IERC20(token).transfer(feeReceiver, fee), "Admin token transfer failed");
        }
    }

    // ==========================================
    // 管理员方法：随时调整费率
    // ==========================================
    function setFeeRate(uint256 _rate) external onlyOwner {
        require(_rate <= 500, "Fee too high"); // 最高限制 5%
        feeRate = _rate;
    }

    function setInitialReferrerShare(uint256 _share) external onlyOwner {
        require(_share <= 10000, "Share too high");
        initialReferrerShare = _share;
    }

    function setDefaultReferrerShare(uint256 _share) external onlyOwner {
        require(_share <= 10000, "Share too high");
        defaultReferrerShare = _share;
    }

    function setFeeReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "Invalid address");
        feeReceiver = _receiver;
    }

    // ==========================================
    // 紧急救援：如果有人误打钱进合约，管理员可以提走
    // ==========================================
    function emergencyWithdrawETH() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    function emergencyWithdrawToken(address token) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner, bal);
    }

    // 允许合约接收 BNB
    receive() external payable {}
}