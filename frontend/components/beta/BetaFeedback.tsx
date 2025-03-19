import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/auth';
import betaUserService from '@/services/betaUserService';

interface BetaFeedbackProps {
  onClose?: () => void;
}

export function BetaFeedback({ onClose }: BetaFeedbackProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [category, setCategory] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');

  const handleSubmit = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get beta user ID
      const betaUser = await betaUserService.getBetaUserByEmail(user.email || '');
      
      if (!betaUser) {
        throw new Error("Beta user not found");
      }
      
      // Submit feedback
      const success = await betaUserService.submitBetaFeedback({
        userId: betaUser.id,
        rating,
        category,
        feedback
      });
      
      if (success) {
        toast({
          title: "Feedback submitted",
          description: "Thank you for your feedback! It helps us improve Mizuchi.",
          variant: "default"
        });
        
        // Reset form
        setRating(0);
        setCategory('');
        setFeedback('');
        
        // Close modal if provided
        if (onClose) {
          onClose();
        }
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Beta Feedback</CardTitle>
        <CardDescription>
          Help us improve Mizuchi by sharing your experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Overall Experience</Label>
          <RadioGroup 
            className="flex space-x-2 pt-2" 
            value={rating.toString()} 
            onValueChange={(value) => setRating(parseInt(value))}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <div key={value} className="flex flex-col items-center">
                <RadioGroupItem 
                  value={value.toString()} 
                  id={`rating-${value}`} 
                  className="sr-only"
                />
                <Label
                  htmlFor={`rating-${value}`}
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full border-2
                    ${rating === value 
                      ? 'border-primary bg-primary text-primary-foreground' 
                      : 'border-muted hover:border-muted-foreground cursor-pointer'
                    }
                  `}
                >
                  {value}
                </Label>
                <span className="text-xs mt-1">
                  {value === 1 ? 'Poor' : value === 5 ? 'Excellent' : ''}
                </span>
              </div>
            ))}
          </RadioGroup>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category">Feedback Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ui">User Interface</SelectItem>
              <SelectItem value="features">Features & Functionality</SelectItem>
              <SelectItem value="performance">Performance & Speed</SelectItem>
              <SelectItem value="data">Data Accuracy</SelectItem>
              <SelectItem value="ai">AI Analysis</SelectItem>
              <SelectItem value="bugs">Bugs & Issues</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="feedback">Your Feedback</Label>
          <Textarea
            id="feedback"
            placeholder="Please share your thoughts, suggestions, or report any issues you've encountered..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={5}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSubmit}
          disabled={loading || rating === 0 || !category || !feedback.trim()}
          className={onClose ? "" : "w-full"}
        >
          {loading ? "Submitting..." : "Submit Feedback"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default BetaFeedback;
