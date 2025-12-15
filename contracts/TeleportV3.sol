// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// --- UNISWAP V3 INTERFACES ---
interface INonfungiblePositionManager {
        struct DecreaseLiquidityParams {
                    uint256 tokenId;
                            uint128 liquidity;
                                    uint256 amount0Min;
                                            uint256 amount1Min;
                                                    uint256 deadline;
        }
            struct CollectParams {
                        uint256 tokenId;
                                address recipient;
                                        uint128 amount0Max;
                                                uint128 amount1Max;
            }
                struct MintParams {
                            address token0;
                                    address token1;
                                            uint24 fee;
                                                    int24 tickLower;
                                                            int24 tickUpper;
                                                                    uint256 amount0Desired;
                                                                            uint256 amount1Desired;
                                                                                    uint256 amount0Min;
                                                                                            uint256 amount1Min;
                                                                                                    address recipient;
                                                                                                            uint256 deadline;
                }
                    function positions(uint256 tokenId) external view returns (
                                uint96 nonce, address operator, address token0, address token1, uint24 fee,
                                        int24 tickLower, int24 tickUpper, uint128 liquidity,
                                                uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128,
                                                        uint128 tokensOwed0, uint128 tokensOwed1
                    );
                        function decreaseLiquidity(DecreaseLiquidityParams calldata params) external payable returns (uint256 amount0, uint256 amount1);
                            function collect(CollectParams calldata params) external payable returns (uint256 amount0, uint256 amount1);
                                function mint(MintParams calldata params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
                                    function safeTransferFrom(address from, address to, uint256 tokenId) external;
                                        function burn(uint256 tokenId) external payable;
                                            function ownerOf(uint256 tokenId) external view returns (address); // Added for explicit check
}

interface ISwapRouter {
        struct ExactInputSingleParams {
                    address tokenIn;
                            address tokenOut;
                                    uint24 fee;
                                            address recipient;
                                                    uint256 deadline;
                                                            uint256 amountIn;
                                                                    uint256 amountOutMinimum;
                                                                            uint160 sqrtPriceLimitX96;
        }
            function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/**
 * @title TeleportV6 (Final Polish)
  * @notice "Audit Candy" edition: Explicit owner checks, Rich Events, Strict Delta Tracking.
   * @dev Designed for Keeper/Executor execution with maximum safety guarantees.
    */
    contract TeleportV3 is ReentrancyGuard, Ownable, IERC721Receiver {
            using SafeERC20 for IERC20;

                INonfungiblePositionManager public immutable positionManager;
                    ISwapRouter public immutable swapRouter;

                        mapping(address => bool) public isExecutor;

                            // RICH EVENT: Includes Fee & Ticks for easy indexing (Graph/Frontend)
                                event LiquidityTeleportedV6(
                                            uint256 indexed oldTokenId,
                                                    uint256 indexed newTokenId,
                                                            address indexed user,
                                                                    uint128 newLiquidity,
                                                                            uint24 newFee,        // Added
                                                                                    int24 newTickLower,   // Added
                                                                                            int24 newTickUpper,   // Added
                                                                                                    bool swapped
                                );

                                    constructor(address _positionManager, address _swapRouter) Ownable(msg.sender) {
                                                require(_positionManager != address(0), "Invalid Manager");
                                                        require(_swapRouter != address(0), "Invalid Router");
                                                                positionManager = INonfungiblePositionManager(_positionManager);
                                                                        swapRouter = ISwapRouter(_swapRouter);
                                                                                isExecutor[msg.sender] = true; 
                                    }

                                        function setExecutor(address _executor, bool _status) external onlyOwner {
                                                    isExecutor[_executor] = _status;
                                        }

                                            modifier onlyAuthorized() {
                                                        require(isExecutor[msg.sender], "Not authorized executor");
                                                                _;
                                            }

                                                struct TeleportParams {
                                                            uint256 tokenId;
                                                                    uint24 newFee;
                                                                            int24 newTickLower;
                                                                                    int24 newTickUpper;
                                                                                            uint256 amount0MinMint;
                                                                                                    uint256 amount1MinMint;
                                                                                                            uint256 amount0MinDecrease;
                                                                                                                    uint256 amount1MinDecrease;
                                                                                                                            uint256 deadline;
                                                                                                                                    bool doSwap;
                                                                                                                                            bool zeroForOne;
                                                                                                                                                    uint256 amountToSwap;
                                                                                                                                                            uint256 amountOutSwapMin;
                                                                                                                                                                    uint24 swapFee;
                                                }

                                                    /**
                                                         * @notice Migrates liquidity. Callable only by whitelisted Executors.
                                                              * @dev User must approve `tokenId` to this contract beforehand.
                                                                   */
                                                                       function teleportLiquidityV6(TeleportParams calldata params) 
                                                                               external 
                                                                                       nonReentrant 
                                                                                               onlyAuthorized 
                                                                                                       returns (uint256 newTokenId, uint128 newLiquidity) 
                                                                                                           {
                                                                                                                    // Sanity Checks
                                                                                                                            require(params.deadline >= block.timestamp, "Deadline passed");
                                                                                                                                    require(params.newFee > 0, "Invalid new fee");
                                                                                                                                            if (params.doSwap) {
                                                                                                                                                            require(params.swapFee > 0, "Invalid swap fee");
                                                                                                                                            }

                                                                                                                                                    // 0. EXPLICIT OWNER CHECK (Audit Candy)
                                                                                                                                                            // Ensures only the true owner's NFT is being moved, failing fast if not.
                                                                                                                                                                    require(positionManager.ownerOf(params.tokenId) == msg.sender, "Not NFT owner");

                                                                                                                                                                            // 1. Fetch Position Info
                                                                                                                                                                                    (,, address token0, address token1, , , , uint128 liquidity, , , , ) = 
                                                                                                                                                                                                positionManager.positions(params.tokenId);
                                                                                                                                                                                                        require(liquidity > 0, "No liquidity");

                                                                                                                                                                                                                // Snapshot for ultimate safety (refund logic)
                                                                                                                                                                                                                        uint256 balance0Start = IERC20(token0).balanceOf(address(this));
                                                                                                                                                                                                                                uint256 balance1Start = IERC20(token1).balanceOf(address(this));

                                                                                                                                                                                                                                        // 2. Transfer & Decrease
                                                                                                                                                                                                                                                positionManager.safeTransferFrom(msg.sender, address(this), params.tokenId);

                                                                                                                                                                                                                                                        positionManager.decreaseLiquidity(INonfungiblePositionManager.DecreaseLiquidityParams({
                                                                                                                                                                                                                                                                        tokenId: params.tokenId,
                                                                                                                                                                                                                                                                                    liquidity: liquidity,
                                                                                                                                                                                                                                                                                                amount0Min: params.amount0MinDecrease,
                                                                                                                                                                                                                                                                                                            amount1Min: params.amount1MinDecrease,
                                                                                                                                                                                                                                                                                                                        deadline: params.deadline
                                                                                                                                                                                                                                                        }));

                                                                                                                                                                                                                                                                // 3. Collect & Track Delta
                                                                                                                                                                                                                                                                        (uint256 amount0Available, uint256 amount1Available) = positionManager.collect(INonfungiblePositionManager.CollectParams({
                                                                                                                                                                                                                                                                                        tokenId: params.tokenId,
                                                                                                                                                                                                                                                                                                    recipient: address(this),
                                                                                                                                                                                                                                                                                                                amount0Max: type(uint128).max,
                                                                                                                                                                                                                                                                                                                            amount1Max: type(uint128).max
                                                                                                                                                                                                                                                                        }));

                                                                                                                                                                                                                                                                                // 4. Burn Old Position
                                                                                                                                                                                                                                                                                        positionManager.burn(params.tokenId);

                                                                                                                                                                                                                                                                                                // 5. Auto-Swap (Strict Budgeting)
                                                                                                                                                                                                                                                                                                        if (params.doSwap && params.amountToSwap > 0) {
                                                                                                                                                                                                                                                                                                                        (amount0Available, amount1Available) = _performStrictSwap(
                                                                                                                                                                                                                                                                                                                                            params, 
                                                                                                                                                                                                                                                                                                                                                            token0, 
                                                                                                                                                                                                                                                                                                                                                                            token1, 
                                                                                                                                                                                                                                                                                                                                                                                            amount0Available, 
                                                                                                                                                                                                                                                                                                                                                                                                            amount1Available
                                                                                                                                                                                                                                                                                                                        );
                                                                                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                                                                                                // 6. Mint New Position (Strict Budgeting)
                                                                                                                                                                                                                                                                                                                        (newTokenId, newLiquidity) = _mintStrict(
                                                                                                                                                                                                                                                                                                                                        params, 
                                                                                                                                                                                                                                                                                                                                                    token0, 
                                                                                                                                                                                                                                                                                                                                                                token1, 
                                                                                                                                                                                                                                                                                                                                                                            amount0Available, 
                                                                                                                                                                                                                                                                                                                                                                                        amount1Available
                                                                                                                                                                                                                                                                                                                        );

                                                                                                                                                                                                                                                                                                                                // 7. Refund Dust (Difference check)
                                                                                                                                                                                                                                                                                                                                        _refundDelta(token0, msg.sender, balance0Start);
                                                                                                                                                                                                                                                                                                                                                _refundDelta(token1, msg.sender, balance1Start);

                                                                                                                                                                                                                                                                                                                                                        // RICH EVENT EMISSION
                                                                                                                                                                                                                                                                                                                                                                emit LiquidityTeleportedV6(
                                                                                                                                                                                                                                                                                                                                                                                params.tokenId, 
                                                                                                                                                                                                                                                                                                                                                                                            newTokenId, 
                                                                                                                                                                                                                                                                                                                                                                                                        msg.sender, 
                                                                                                                                                                                                                                                                                                                                                                                                                    newLiquidity, 
                                                                                                                                                                                                                                                                                                                                                                                                                                params.newFee,      // New Fee Tier
                                                                                                                                                                                                                                                                                                                                                                                                                                            params.newTickLower,// New Tick Lower
                                                                                                                                                                                                                                                                                                                                                                                                                                                        params.newTickUpper,// New Tick Upper
                                                                                                                                                                                                                                                                                                                                                                                                                                                                    params.doSwap
                                                                                                                                                                                                                                                                                                                                                                );
                                                                                                           }

                                                                                                               // --- Internal Logic ---

                                                                                                                   function _performStrictSwap(
                                                                                                                            TeleportParams calldata params, 
                                                                                                                                    address token0, 
                                                                                                                                            address token1,
                                                                                                                                                    uint256 amount0Avail,
                                                                                                                                                            uint256 amount1Avail
                                                                                                                   ) private returns (uint256 newAmount0, uint256 newAmount1) {
                                                                                                                            address tokenIn = params.zeroForOne ? token0 : token1;
                                                                                                                                    address tokenOut = params.zeroForOne ? token1 : token0;
                                                                                                                                            
                                                                                                                                                    uint256 amountIn = params.amountToSwap;
                                                                                                                                                            
                                                                                                                                                                    if (params.zeroForOne) {
                                                                                                                                                                                    require(amountIn <= amount0Avail, "Swap > Avail0");
                                                                                                                                                                    } else {
                                                                                                                                                                                    require(amountIn <= amount1Avail, "Swap > Avail1");
                                                                                                                                                                    }

                                                                                                                                                                            IERC20(tokenIn).forceApprove(address(swapRouter), amountIn);

                                                                                                                                                                                    uint256 amountOut = swapRouter.exactInputSingle(ISwapRouter.ExactInputSingleParams({
                                                                                                                                                                                                    tokenIn: tokenIn,
                                                                                                                                                                                                                tokenOut: tokenOut,
                                                                                                                                                                                                                            fee: params.swapFee,
                                                                                                                                                                                                                                        recipient: address(this),
                                                                                                                                                                                                                                                    deadline: params.deadline,
                                                                                                                                                                                                                                                                amountIn: amountIn,
                                                                                                                                                                                                                                                                            amountOutMinimum: params.amountOutSwapMin,
                                                                                                                                                                                                                                                                                        sqrtPriceLimitX96: 0
                                                                                                                                                                                    }));

                                                                                                                                                                                            if (params.zeroForOne) {
                                                                                                                                                                                                            newAmount0 = amount0Avail - amountIn;
                                                                                                                                                                                                                        newAmount1 = amount1Avail + amountOut;
                                                                                                                                                                                            } else {
                                                                                                                                                                                                            newAmount0 = amount0Avail + amountOut;
                                                                                                                                                                                                                        newAmount1 = amount1Avail - amountIn;
                                                                                                                                                                                            }
                                                                                                                   }

                                                                                                                       function _mintStrict(
                                                                                                                                TeleportParams calldata params, 
                                                                                                                                        address token0, 
                                                                                                                                                address token1,
                                                                                                                                                        uint256 amount0Budget,
                                                                                                                                                                uint256 amount1Budget
                                                                                                                       ) private returns (uint256 tokenId, uint128 liquidity) {
                                                                                                                                IERC20(token0).forceApprove(address(positionManager), amount0Budget);
                                                                                                                                        IERC20(token1).forceApprove(address(positionManager), amount1Budget);

                                                                                                                                                (tokenId, liquidity, , ) = positionManager.mint(INonfungiblePositionManager.MintParams({
                                                                                                                                                                token0: token0,
                                                                                                                                                                            token1: token1,
                                                                                                                                                                                        fee: params.newFee,
                                                                                                                                                                                                    tickLower: params.newTickLower,
                                                                                                                                                                                                                tickUpper: params.newTickUpper,
                                                                                                                                                                                                                            amount0Desired: amount0Budget,
                                                                                                                                                                                                                                        amount1Desired: amount1Budget,
                                                                                                                                                                                                                                                    amount0Min: params.amount0MinMint,
                                                                                                                                                                                                                                                                amount1Min: params.amount1MinMint,
                                                                                                                                                                                                                                                                            recipient: msg.sender,
                                                                                                                                                                                                                                                                                        deadline: params.deadline
                                                                                                                                                }));
                                                                                                                       }

                                                                                                                           function _refundDelta(address token, address to, uint256 balanceBefore) private {
                                                                                                                                    uint256 balanceAfter = IERC20(token).balanceOf(address(this));
                                                                                                                                            if (balanceAfter > balanceBefore) {
                                                                                                                                                            uint256 delta = balanceAfter - balanceBefore;
                                                                                                                                                                        IERC20(token).safeTransfer(to, delta);
                                                                                                                                            }
                                                                                                                           }

                                                                                                                               function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
                                                                                                                                        return this.onERC721Received.selector;
                                                                                                                               }
    }
                                                                                                                               }
                                                                                                                                            }
                                                                                                                           }
                                                                                                                                                }))
                                                                                                                       }
                                                                                                                       )
                                                                                                                                                                                            }
                                                                                                                                                                                            }
                                                                                                                                                                                    }))
                                                                                                                                                                    }
                                                                                                                                                                    }
                                                                                                                   }
                                                                                                                   )
                                                                                                                                                                                                                                                                                                                                                                )
                                                                                                                                                                                                                                                                                                                        )
                                                                                                                                                                                                                                                                                                                        )
                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                        }))
                                                                                                                                                                                                                                                        }))
                                                                                                                                            }
                                                                                                           }
                                                }
                                            }
                                        }
                                    }
                                )
    }
        }
}
                    )
                }
            }
        }
}