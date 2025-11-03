import express from 'express';
import { run } from '@openai/agents';
import { coordinatorAgent } from '../agents/coordinator.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Multi-Agent Chat endpoint
router.post('/chat', authMiddleware, asyncHandler(async (req, res) => {
  const { message } = req.body;
  const userId = req.user?.id;
  const authHeader = req.headers.authorization;
  const userToken = authHeader?.split(' ')[1];

  if (!userId || !userToken) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message is required'
    });
  }

  try {
    console.log('Multi-agent request:', { userId, message });

    // Run the coordinator agent with user context
    const result = await run(
      coordinatorAgent,
      message,
      {
        context: {
          userId,
          userToken
        },
        maxTurns: 20 // Allow multiple agent interactions
      }
    );

    console.log('Multi-agent result:', {
      finalOutput: result.finalOutput,
      agentPath: result.agentName
    });

    res.json({
      success: true,
      result: result.finalOutput,
      agent: result.agentName
    });

  } catch (error) {
    console.error('Multi-agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}));

export default router;
