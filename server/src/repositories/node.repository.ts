import { Node } from "../models/node.model";

export class NodeRepository {

    /**
     * Find node by nodeId
     */
    async findByNodeId(nodeId: string) {
        return Node.findOne({ nodeId });
    }

    /**
     * Find node by device public key
     */
    async findByPublicKey(publicKey: string) {
        return Node.findOne({ devicePublicKey: publicKey });
    }

    /**
     * Create new node (device registration)
     */
async createNode(
  nodeId: string,
  devicePublicKey: string,
  ownerEmail: string,
  ownerWallet: string,
) {
  return Node.create({
    nodeId,
    devicePublicKey,
    ownerEmail,
    ownerWallet,
    isLinked: false,
  });
}



    /**
     * Upsert basic node info
     */
    async upsertNode(nodeId: string, ownerEmail: string) {
        return Node.findOneAndUpdate(
            { nodeId },
            { ownerEmail },
            { upsert: true, new: true }
        );
    }

    /**
     * Store linking challenge (for security)
     */
    async setChallenge(publicKey: string, challenge: string) {
        return Node.findOneAndUpdate(
            { devicePublicKey: publicKey },
            { linkChallenge: challenge },
            { new: true }
        );
    }

    /**
     * Link node to user wallet (FINAL STEP)
     */
    async linkNode(
        publicKey: string,
        email: string,
        wallet: string,
        nodeAccount: string
    ) {
        return Node.findOneAndUpdate(
            { devicePublicKey: publicKey },
            {
                ownerEmail: email,
                ownerWallet: wallet,
                nodeAccount,
                isLinked: true,
                linkChallenge: null
            },
            { new: true }
        );
    }

    /**
     * Get all nodes for a user
     */
    async getNodesByEmail(email: string) {
        return Node.find({ ownerEmail: email });
    }

    /**
     * Attach Solana PDA after creation
     */
    async updateNodeAccount(nodeId: string, nodeAccount: string) {
        return Node.findOneAndUpdate(
            { nodeId },
            { nodeAccount },
            { new: true }
        );
    }
}
